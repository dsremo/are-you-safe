const https = require('https');
const crypto = require('crypto');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { TABLES, putItem, getItem, queryItems } = require('../utils/dynamodb');

const ses = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

/**
 * Multi-channel alert handler. Invoked by ays-monitor Lambda (async).
 * Alert priority:
 *   1. Try SMS via Twilio (if configured)
 *   2. If SMS fails → send email as fallback
 *   3. If contact has the app → send FCM push notification
 *   4. Send FCM push to user's device to trigger mobile SMS (fallback)
 */
exports.handler = async (event) => {
  const {
    userId,
    contactId,
    contactName,
    contactPhone,
    contactEmail,
    method,
    daysMissed,
    senderName,
    customMessage,
  } = event;

  console.log(`Alert for ${contactName}: method=${method}, phone=${contactPhone}, email=${contactEmail}`);

  const message = customMessage || generateEmergencyMessage(contactName, senderName, daysMissed);
  const results = { sms: null, email: null, push: null, mobileSms: null };

  // 1. Try SMS via Twilio (if method includes sms)
  if ((method === 'sms' || method === 'both') && contactPhone) {
    try {
      const sid = await sendTwilioSms(contactPhone, message);
      results.sms = { status: 'sent', messageId: sid };
      console.log(`SMS sent to ${contactPhone} via Twilio`);
    } catch (err) {
      console.warn(`Twilio SMS failed: ${err.message}`);
      results.sms = { status: 'failed', error: err.message };

      // SMS failed → send push to user's device to trigger mobile SMS
      try {
        await sendMobileSmsPush(userId, contactPhone, contactName, message);
        results.mobileSms = { status: 'queued' };
        console.log(`Mobile SMS push queued for user ${userId}`);
      } catch (pushErr) {
        console.warn(`Mobile SMS push failed: ${pushErr.message}`);
        results.mobileSms = { status: 'failed', error: pushErr.message };
      }
    }
  }

  // 2. Send email (always if email is available, or as SMS fallback)
  const smsFailed = results.sms?.status === 'failed';
  const shouldSendEmail = method === 'email' || method === 'both' || smsFailed;

  if (shouldSendEmail && contactEmail) {
    try {
      const msgId = await sendEmail(contactEmail, senderName, contactName, message, daysMissed);
      results.email = { status: 'sent', messageId: msgId };
      console.log(`Email sent to ${contactEmail}`);
    } catch (err) {
      console.error(`Email failed: ${err.message}`);
      results.email = { status: 'failed', error: err.message };
    }
  }

  // 3. Check if contact also has the app → send in-app push notification
  try {
    await sendInAppNotificationToContact(contactEmail, contactPhone, senderName, daysMissed);
    results.push = { status: 'sent' };
  } catch (err) {
    // Not an error — contact may not have the app
    results.push = { status: 'skipped', reason: err.message };
  }

  // Determine overall status
  const anySent = Object.values(results).some(r => r?.status === 'sent' || r?.status === 'queued');
  const overallStatus = anySent ? 'sent' : 'failed';

  // Log the alert
  await putItem(TABLES.ALERT_LOG, {
    userId,
    alertTimestamp: Date.now(),
    contactId,
    contactName,
    method,
    status: overallStatus,
    daysMissed,
    channels: results,
  });

  return { status: overallStatus, channels: results };
};

function generateEmergencyMessage(contactName, senderName, daysMissed) {
  return `SAFETY ALERT

Dear ${contactName},

This is an automated message from the "Are You Safe?" app.

${senderName} hasn't checked in for ${daysMissed} consecutive days. This could mean:
- They may be in trouble and need help
- They may have had an accident or emergency
- They may be ill or incapacitated

Please try to contact ${senderName} immediately or check on their wellbeing.

If you cannot reach them, please consider:
1. Trying to contact other family members or friends
2. Visiting their last known location
3. Contacting local authorities if necessary

This is a pre-configured safety alert. Thank you for caring.

- Sent via "Are You Safe?" App`;
}

// ---- SMS via Twilio ----
async function sendTwilioSms(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio not configured');
  }

  let formattedPhone = phone.replace(/[\s-]/g, '');
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.startsWith('91')
      ? '+' + formattedPhone
      : '+91' + formattedPhone;
  }

  const postData = new URLSearchParams({
    To: formattedPhone,
    From: fromNumber,
    Body: message,
  }).toString();

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(body);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed.sid || '');
        } else {
          reject(new Error(parsed.message || `Twilio HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ---- Email via SES ----
async function sendEmail(toEmail, senderName, contactName, textMessage, daysMissed) {
  const subject = `Safety Alert: ${senderName} hasn't checked in for ${daysMissed} days`;

  const result = await ses.send(new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL || 'dsremo7@gmail.com',
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: textMessage },
        Html: {
          Data: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fff;">
              <div style="background:#FF6B6B;padding:20px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 style="color:#fff;margin:0;">⚠ Safety Alert</h1>
              </div>
              <div style="padding:20px;border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;">
                <p>Dear <strong>${contactName}</strong>,</p>
                <p style="background:#FFF3CD;padding:15px;border-radius:8px;border-left:4px solid #FF9800;">
                  <strong>${senderName}</strong> hasn't checked in to the "Are You Safe?" app for
                  <strong style="color:#FF6B6B;">${daysMissed} consecutive days</strong>.
                </p>
                <p>This could mean they may need help. Please try to contact them immediately.</p>
                <h3>If you cannot reach them:</h3>
                <ol>
                  <li>Try contacting other family members or friends</li>
                  <li>Visit their last known location</li>
                  <li>Contact local authorities if necessary</li>
                </ol>
                <hr style="margin:20px 0;"/>
                <p style="color:#888;font-size:12px;text-align:center;">
                  This is an automated safety alert from the "Are You Safe?" app.<br/>
                  ${senderName} configured you as an emergency contact.
                </p>
              </div>
            </div>
          `,
        },
      },
    },
  }));

  return result.MessageId || '';
}

// ---- FCM Push: Tell user's device to send SMS natively ----
async function sendMobileSmsPush(userId, contactPhone, contactName, message) {
  const projectId = process.env.FCM_PROJECT_ID;
  if (!projectId) throw new Error('FCM not configured');

  const user = await getItem(TABLES.USERS, { userId });
  if (!user?.fcmToken) throw new Error('User has no FCM token');

  await sendFcmV1Message(user.fcmToken, {
    data: {
      type: 'send_sms',
      phone: contactPhone,
      contactName,
      message,
    },
  });
}

// ---- FCM Push: In-app notification to contact who has the app ----
async function sendInAppNotificationToContact(contactEmail, contactPhone, senderName, daysMissed) {
  const projectId = process.env.FCM_PROJECT_ID;
  if (!projectId) throw new Error('FCM not configured');

  // Look up if any app user matches this contact's email
  let items = [];
  try {
    const result = await queryItems(
      TABLES.USERS,
      'email = :email',
      { ':email': contactEmail },
      { indexName: 'email-index' }
    );
    items = result.items || [];
  } catch (e) {
    // Index may not exist yet or query failed
    items = [];
  }

  if (items.length === 0) {
    throw new Error('Contact is not an app user');
  }

  const contactUser = items[0];
  if (!contactUser.fcmToken) throw new Error('Contact user has no FCM token');

  await sendFcmV1Message(contactUser.fcmToken, {
    notification: {
      title: 'Safety Alert',
      body: `${senderName} hasn't checked in for ${daysMissed} days. Please check on them.`,
    },
    data: {
      type: 'emergency_alert',
      senderName,
      daysMissed: String(daysMissed),
    },
  });
}

// ---- FCM V1 API with Service Account ----
let cachedAccessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKeyB64 = process.env.FCM_PRIVATE_KEY_B64;
  if (!clientEmail || !privateKeyB64) throw new Error('FCM service account not configured');

  const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
  const now = Math.floor(Date.now() / 1000);

  // Create JWT header and claim
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signInput = `${header}.${claim}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await httpPost('oauth2.googleapis.com', '/token', new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }).toString(), { 'Content-Type': 'application/x-www-form-urlencoded' });

  const parsed = JSON.parse(tokenResponse);
  cachedAccessToken = parsed.access_token;
  tokenExpiry = Date.now() + (parsed.expires_in - 60) * 1000; // refresh 60s early
  return cachedAccessToken;
}

async function sendFcmV1Message(fcmToken, messagePayload) {
  const projectId = process.env.FCM_PROJECT_ID;
  const accessToken = await getAccessToken();

  const body = JSON.stringify({
    message: {
      token: fcmToken,
      android: { priority: 'high' },
      ...messagePayload,
    },
  });

  const response = await httpPost(
    'fcm.googleapis.com',
    `/v1/projects/${projectId}/messages:send`,
    body,
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    }
  );

  console.log('FCM V1 sent:', response);
  return response;
}

function httpPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

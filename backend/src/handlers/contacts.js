const https = require('https');
const { TABLES, getItem, putItem, updateItem, deleteItem, queryItems } = require('../utils/dynamodb');
const { extractUserId } = require('../utils/auth');
const { success, error } = require('../utils/response');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return success({});

  const userId = extractUserId(event);
  if (!userId) return error('Unauthorized', 401);

  const method = event.httpMethod;
  const path = event.path;
  const pathParts = path.split('/').filter(Boolean);
  // /contacts, /contacts/{id}, /contacts/{id}/test
  const contactId = pathParts[1] || null;
  const isTest = pathParts[2] === 'test';

  console.log('Contacts handler:', { method, path, pathParts, contactId, isTest });

  // Test alert must be checked BEFORE generic POST
  if (method === 'POST' && contactId && isTest) return testAlert(userId, contactId, event);
  if (method === 'GET' && !contactId) return listContacts(userId);
  if (method === 'POST' && !contactId) return addContact(userId, event);
  if (method === 'PUT' && contactId) return editContact(userId, contactId, event);
  if (method === 'DELETE' && contactId) return removeContact(userId, contactId);

  return error('Not found', 404);
};

async function listContacts(userId) {
  const { items } = await queryItems(
    TABLES.CONTACTS,
    'userId = :uid',
    { ':uid': userId },
    { scanForward: true }
  );
  return success({ contacts: items });
}

async function addContact(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const { name, phone, email, alertMethods, customMessage } = body;

  if (!name || !name.trim()) return error('Name is required');
  if (!phone && !email) return error('Phone or email is required');
  if (!alertMethods || alertMethods.length === 0) return error('At least one alert method is required');

  const contactId = `c-${Date.now()}`;
  const contact = {
    userId,
    contactId,
    name: name.trim(),
    phone: (phone || '').trim(),
    email: (email || '').trim().toLowerCase(),
    alertMethods,
    customMessage: (customMessage || '').trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await putItem(TABLES.CONTACTS, contact);

  return success({ contactId, message: 'Contact added successfully' }, 201);
}

async function editContact(userId, contactId, event) {
  const existing = await getItem(TABLES.CONTACTS, { userId, contactId });
  if (!existing) return error('Contact not found', 404);

  const body = JSON.parse(event.body || '{}');
  const updates = { updatedAt: Date.now() };

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.phone !== undefined) updates.phone = body.phone.trim();
  if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
  if (body.alertMethods !== undefined) updates.alertMethods = body.alertMethods;
  if (body.customMessage !== undefined) updates.customMessage = body.customMessage.trim();

  await updateItem(TABLES.CONTACTS, { userId, contactId }, updates);

  return success({ message: 'Contact updated successfully' });
}

async function removeContact(userId, contactId) {
  const existing = await getItem(TABLES.CONTACTS, { userId, contactId });
  if (!existing) return error('Contact not found', 404);

  await deleteItem(TABLES.CONTACTS, { userId, contactId });
  return success({ message: 'Contact deleted successfully' });
}

async function testAlert(userId, contactId, event) {
  const body = JSON.parse(event.body || '{}');
  const alertMethod = body.method || 'sms';

  console.log('testAlert called:', { userId, contactId, alertMethod });

  const contact = await getItem(TABLES.CONTACTS, { userId, contactId });
  if (!contact) {
    console.log('Contact not found:', { userId, contactId });
    return error('Contact not found', 404);
  }

  const user = await getItem(TABLES.USERS, { userId });
  const senderName = user?.displayName || 'Someone';

  console.log('Sending test alert:', { contactName: contact.name, alertMethod, phone: contact.phone, email: contact.email });

  const testMessage = `TEST MESSAGE\n\nHi ${contact.name}!\n\nThis is a TEST from the "Are You Safe?" app.\n\n${senderName} is testing their emergency alert system. No action needed.\n\nIf you received this, the system is working correctly!`;

  try {
    if (alertMethod === 'sms' && contact.phone) {
      await sendSms(contact.phone, testMessage);
      console.log('SMS sent successfully to', contact.phone);
    } else if (alertMethod === 'email' && contact.email) {
      await sendEmail(contact.email, `Test Alert from ${senderName}`, testMessage);
      console.log('Email sent successfully to', contact.email);
    } else {
      console.log('Cannot send:', { alertMethod, phone: contact.phone, email: contact.email });
      return error(`Cannot send test via ${alertMethod} - missing contact info`);
    }

    return success({ success: true, message: `Test alert sent via ${alertMethod}` });
  } catch (err) {
    console.error('Test alert error:', err.message, err.stack);
    return error(`Failed to send test alert: ${err.message}`, 500);
  }
}

async function sendSms(phone, message) {
  let formattedPhone = phone.replace(/[\s-]/g, '');
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.startsWith('91')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+91' + formattedPhone;
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_NUMBER;

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
          console.log('Twilio SMS sent:', parsed.sid, 'status:', parsed.status);
          resolve(parsed.sid || '');
        } else {
          console.error('Twilio error:', parsed.message || body);
          reject(new Error(parsed.message || `Twilio HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendEmail(email, subject, textBody) {
  await ses.send(new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL || 'dsremo7@gmail.com',
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: textBody },
        Html: {
          Data: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#4CAF50;">${subject}</h2>
            <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${textBody}</pre>
            <hr style="margin-top:30px;"/>
            <p style="color:#888;font-size:12px;">Sent by Are You Safe? App</p>
          </div>`,
        },
      },
    },
  }));
}

// Export for use by sendAlert handler
module.exports.sendSms = sendSms;
module.exports.sendEmail = sendEmail;

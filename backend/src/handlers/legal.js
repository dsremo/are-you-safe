exports.handler = async (event) => {
  const path = event.path;

  if (path === '/privacy' || path === '/privacy-policy') {
    return htmlResponse(privacyPolicy());
  }
  if (path === '/terms' || path === '/terms-of-service') {
    return htmlResponse(termsOfService());
  }

  return htmlResponse('<h1>Not Found</h1>', 404);
};

function htmlResponse(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
    },
    body,
  };
}

function privacyPolicy() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Are You Safe?</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; }
    h1 { color: #4CAF50; }
    h2 { color: #555; margin-top: 30px; }
    p { margin: 10px 0; }
    .updated { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: February 10, 2025</p>

  <p><strong>Are You Safe?</strong> ("we", "our", or "the app") is a personal safety check-in application. This policy describes how we collect, use, and protect your information.</p>

  <h2>1. Information We Collect</h2>
  <p><strong>Account Information:</strong> When you sign in with Google, we receive your name, email address, and profile picture from your Google account.</p>
  <p><strong>Check-in Data:</strong> We store timestamps of when you confirm your safety through the app.</p>
  <p><strong>Emergency Contacts:</strong> Names, phone numbers, and email addresses of contacts you add for safety alerts.</p>
  <p><strong>Device Information:</strong> Firebase Cloud Messaging token for sending push notifications.</p>
  <p><strong>Settings:</strong> Your app preferences such as reminder time and notification settings.</p>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To provide the safety check-in service</li>
    <li>To send you daily reminder notifications</li>
    <li>To alert your emergency contacts if you miss check-ins beyond your configured threshold</li>
    <li>To maintain your check-in history and streak</li>
  </ul>

  <h2>3. Information Sharing</h2>
  <p>We do <strong>not</strong> sell, trade, or share your personal information with third parties. Your emergency contacts will only receive alerts (SMS or email) if you miss your safety check-ins beyond the threshold you set.</p>

  <h2>4. Data Storage & Security</h2>
  <p>Your data is stored securely on Amazon Web Services (AWS) servers in the Asia Pacific (Mumbai) region. We use encryption in transit (HTTPS) and follow security best practices.</p>

  <h2>5. Data Retention & Deletion</h2>
  <p>You can delete your account at any time from the app settings. When you delete your account, all your data (check-ins, contacts, settings) is permanently removed from our servers.</p>

  <h2>6. Third-Party Services</h2>
  <p>We use the following third-party services:</p>
  <ul>
    <li><strong>Google Sign-In</strong> - for authentication</li>
    <li><strong>Firebase Cloud Messaging</strong> - for push notifications</li>
    <li><strong>Amazon Web Services</strong> - for data storage and processing</li>
    <li><strong>Amazon SNS</strong> - for sending SMS alerts to emergency contacts</li>
    <li><strong>Amazon SES</strong> - for sending email alerts to emergency contacts</li>
  </ul>

  <h2>7. Your Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Access your personal data through the app</li>
    <li>Update your information at any time</li>
    <li>Delete your account and all associated data</li>
    <li>Opt out of notifications</li>
  </ul>

  <h2>8. Children's Privacy</h2>
  <p>This app is not intended for children under 13. We do not knowingly collect information from children under 13.</p>

  <h2>9. Changes to This Policy</h2>
  <p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated date.</p>

  <h2>10. Contact Us</h2>
  <p>If you have questions about this privacy policy, please contact us at: <strong>areyousafeapp@gmail.com</strong></p>
</body>
</html>`;
}

function termsOfService() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Are You Safe?</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; }
    h1 { color: #4CAF50; }
    h2 { color: #555; margin-top: 30px; }
    p { margin: 10px 0; }
    .updated { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p class="updated">Last updated: February 10, 2025</p>

  <p>By using <strong>Are You Safe?</strong> ("the app"), you agree to these terms.</p>

  <h2>1. Service Description</h2>
  <p>Are You Safe? is a personal safety check-in app. You check in daily to confirm your safety. If you miss check-ins beyond your configured threshold, the app alerts your designated emergency contacts via SMS or email.</p>

  <h2>2. Account</h2>
  <p>You must sign in with a Google account to use the app. You are responsible for maintaining the security of your account.</p>

  <h2>3. Emergency Contacts</h2>
  <p>You are responsible for obtaining consent from any emergency contacts you add to the app. By adding a contact, you confirm that the contact has agreed to receive safety alert messages from this service.</p>

  <h2>4. No Guarantee</h2>
  <p>While we strive for reliable service, Are You Safe? is provided "as is" without warranty. We do not guarantee that alerts will be delivered in all circumstances. This app is a supplementary safety tool and should not be relied upon as the sole means of emergency communication.</p>

  <h2>5. Acceptable Use</h2>
  <p>You agree not to misuse the service, including but not limited to:</p>
  <ul>
    <li>Adding contacts without their consent</li>
    <li>Using the service to harass or spam others</li>
    <li>Attempting to access other users' data</li>
  </ul>

  <h2>6. Termination</h2>
  <p>You may stop using the app and delete your account at any time. We reserve the right to suspend accounts that violate these terms.</p>

  <h2>7. Changes</h2>
  <p>We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.</p>

  <h2>8. Contact</h2>
  <p>For questions about these terms, contact us at: <strong>areyousafeapp@gmail.com</strong></p>
</body>
</html>`;
}

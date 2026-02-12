const { OAuth2Client } = require('google-auth-library');
const { TABLES, getItem, putItem, updateItem } = require('../utils/dynamodb');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/auth');
const { success, error } = require('../utils/response');

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return success({});

  const path = event.path;
  const body = JSON.parse(event.body || '{}');

  if (path === '/auth/google' && event.httpMethod === 'POST') {
    return handleGoogleSignIn(body);
  }
  if (path === '/auth/refresh' && event.httpMethod === 'POST') {
    return handleRefreshToken(body);
  }

  return error('Not found', 404);
};

async function handleGoogleSignIn({ idToken, fcmToken }) {
  if (!idToken) return error('idToken is required');

  try {
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
      ],
    });
    const payload = ticket.getPayload();
    const userId = payload.sub;
    const email = payload.email;
    const displayName = payload.name || '';
    const profilePicture = payload.picture || '';

    // Check if user exists
    let user = await getItem(TABLES.USERS, { userId });
    const isNewUser = !user;

    if (isNewUser) {
      // Create new user
      user = await putItem(TABLES.USERS, {
        userId,
        email,
        displayName,
        profilePicture,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        onboardingComplete: false,
        fcmToken: fcmToken || '',
        timezone: 'Asia/Kolkata',
      });

      // Create default settings
      await putItem(TABLES.SETTINGS, {
        userId,
        reminderTime: '09:00',
        missedDaysThreshold: 2,
        enableNotifications: true,
        enableSound: true,
        updatedAt: Date.now(),
      });
    } else {
      // Update existing user
      const updates = { updatedAt: Date.now() };
      if (fcmToken) updates.fcmToken = fcmToken;
      if (displayName) updates.displayName = displayName;
      if (profilePicture) updates.profilePicture = profilePicture;
      await updateItem(TABLES.USERS, { userId }, updates);
    }

    // Generate tokens
    const accessToken = generateToken(userId, email);
    const refreshToken = generateRefreshToken(userId);

    return success({
      userId,
      email,
      displayName,
      isNewUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 2592000, // 30 days
      },
    });
  } catch (err) {
    console.error('Google Sign-In error:', err);
    return error('Invalid Google token', 401);
  }
}

async function handleRefreshToken({ refreshToken }) {
  if (!refreshToken) return error('refreshToken is required');

  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') {
    return error('Invalid refresh token', 401);
  }

  const user = await getItem(TABLES.USERS, { userId: decoded.userId });
  if (!user) return error('User not found', 404);

  const newAccessToken = generateToken(user.userId, user.email);

  return success({
    accessToken: newAccessToken,
    expiresIn: 2592000,
  });
}

const { TABLES, getItem, putItem, updateItem } = require('../utils/dynamodb');
const { extractUserId } = require('../utils/auth');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return success({});

  const userId = extractUserId(event);
  if (!userId) return error('Unauthorized', 401);

  if (event.httpMethod === 'GET') return getSettings(userId);
  if (event.httpMethod === 'PUT') return updateSettings(userId, event);

  return error('Method not allowed', 405);
};

async function getSettings(userId) {
  let settings = await getItem(TABLES.SETTINGS, { userId });

  if (!settings) {
    // Create default settings
    settings = {
      userId,
      reminderTime: '09:00',
      missedDaysThreshold: 2,
      enableNotifications: true,
      enableSound: true,
      updatedAt: Date.now(),
    };
    await putItem(TABLES.SETTINGS, settings);
  }

  // Don't expose userId in response
  const { userId: _, ...rest } = settings;
  return success(rest);
}

async function updateSettings(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const updates = { updatedAt: Date.now() };

  if (body.reminderTime !== undefined) updates.reminderTime = body.reminderTime;
  if (body.missedDaysThreshold !== undefined) updates.missedDaysThreshold = body.missedDaysThreshold;
  if (body.enableNotifications !== undefined) updates.enableNotifications = body.enableNotifications;
  if (body.enableSound !== undefined) updates.enableSound = body.enableSound;

  await updateItem(TABLES.SETTINGS, { userId }, updates);

  return success({ message: 'Settings updated successfully' });
}

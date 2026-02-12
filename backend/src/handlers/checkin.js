const { TABLES, getItem, putItem, updateItem } = require('../utils/dynamodb');
const { extractUserId } = require('../utils/auth');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return success({});

  const userId = extractUserId(event);
  if (!userId) return error('Unauthorized', 401);

  if (event.httpMethod !== 'POST') return error('Method not allowed', 405);

  const body = JSON.parse(event.body || '{}');
  const source = body.source || 'app';

  // Get today's date in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const today = istDate.toISOString().split('T')[0];

  // Check if already checked in today
  const existing = await getItem(TABLES.CHECKINS, { userId, date: today });
  if (existing) {
    return success({
      success: true,
      alreadyCheckedIn: true,
      date: today,
      timestamp: existing.timestamp,
      message: 'Already checked in today',
    });
  }

  // Record check-in
  const timestamp = Date.now();
  await putItem(TABLES.CHECKINS, {
    userId,
    date: today,
    timestamp,
    source,
  });

  // Update user's last check-in
  await updateItem(TABLES.USERS, { userId }, {
    lastCheckIn: today,
    lastCheckInTimestamp: timestamp,
    updatedAt: timestamp,
  });

  return success({
    success: true,
    alreadyCheckedIn: false,
    date: today,
    timestamp,
    message: 'Check-in recorded successfully',
  });
};

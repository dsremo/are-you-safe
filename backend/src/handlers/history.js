const { TABLES, queryItems } = require('../utils/dynamodb');
const { extractUserId } = require('../utils/auth');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return success({});

  const userId = extractUserId(event);
  if (!userId) return error('Unauthorized', 401);

  if (event.httpMethod !== 'GET') return error('Method not allowed', 405);

  const limit = parseInt(event.queryStringParameters?.limit || '30', 10);
  const lastKey = event.queryStringParameters?.lastKey
    ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
    : null;

  // Get check-in history (most recent first)
  const { items: checkIns, lastKey: nextKey } = await queryItems(
    TABLES.CHECKINS,
    'userId = :uid',
    { ':uid': userId },
    { limit, scanForward: false, lastKey }
  );

  // Calculate streak
  const streak = calculateStreak(checkIns);
  const totalCheckIns = checkIns.length;

  return success({
    checkIns: checkIns.map(({ userId: _, ...rest }) => rest),
    lastKey: nextKey ? encodeURIComponent(JSON.stringify(nextKey)) : null,
    streak,
    totalCheckIns,
  });
};

function calculateStreak(checkIns) {
  if (checkIns.length === 0) return 0;

  // Sort by date descending (should already be)
  const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));

  // Get today in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const today = istDate.toISOString().split('T')[0];

  let streak = 0;
  let expectedDate = today;

  for (const checkIn of sorted) {
    if (checkIn.date === expectedDate) {
      streak++;
      // Move to previous day
      const d = new Date(expectedDate);
      d.setDate(d.getDate() - 1);
      expectedDate = d.toISOString().split('T')[0];
    } else if (checkIn.date < expectedDate) {
      // If today hasn't been checked in yet, try starting from yesterday
      if (streak === 0 && expectedDate === today) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        expectedDate = yesterday.toISOString().split('T')[0];
        if (checkIn.date === expectedDate) {
          streak++;
          const d = new Date(expectedDate);
          d.setDate(d.getDate() - 1);
          expectedDate = d.toISOString().split('T')[0];
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  return streak;
}

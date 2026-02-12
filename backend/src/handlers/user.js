const { TABLES, getItem, updateItem, deleteItem, queryItems } = require('../utils/dynamodb');
const { extractUserId } = require('../utils/auth');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return success({});

  const userId = extractUserId(event);
  if (!userId) return error('Unauthorized', 401);

  if (event.httpMethod === 'GET') return getUser(userId);
  if (event.httpMethod === 'PUT') return updateUser(userId, event);
  if (event.httpMethod === 'DELETE') return deleteUser(userId);

  return error('Method not allowed', 405);
};

async function getUser(userId) {
  const user = await getItem(TABLES.USERS, { userId });
  if (!user) return error('User not found', 404);

  return success({
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    profilePicture: user.profilePicture,
    createdAt: user.createdAt,
    onboardingComplete: user.onboardingComplete,
    lastCheckIn: user.lastCheckIn || null,
  });
}

async function updateUser(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const updates = { updatedAt: Date.now() };

  if (body.displayName !== undefined) updates.displayName = body.displayName;
  if (body.fcmToken !== undefined) updates.fcmToken = body.fcmToken;
  if (body.onboardingComplete !== undefined) updates.onboardingComplete = body.onboardingComplete;
  if (body.timezone !== undefined) updates.timezone = body.timezone;

  await updateItem(TABLES.USERS, { userId }, updates);
  return success({ message: 'User updated successfully' });
}

async function deleteUser(userId) {
  // Delete all user data across all tables
  try {
    // Delete contacts
    const { items: contacts } = await queryItems(
      TABLES.CONTACTS, 'userId = :uid', { ':uid': userId }
    );
    for (const contact of contacts) {
      await deleteItem(TABLES.CONTACTS, { userId, contactId: contact.contactId });
    }

    // Delete check-ins
    const { items: checkIns } = await queryItems(
      TABLES.CHECKINS, 'userId = :uid', { ':uid': userId }
    );
    for (const checkIn of checkIns) {
      await deleteItem(TABLES.CHECKINS, { userId, date: checkIn.date });
    }

    // Delete alert logs
    const { items: alerts } = await queryItems(
      TABLES.ALERT_LOG, 'userId = :uid', { ':uid': userId }
    );
    for (const alert of alerts) {
      await deleteItem(TABLES.ALERT_LOG, { userId, alertTimestamp: alert.alertTimestamp });
    }

    // Delete settings
    await deleteItem(TABLES.SETTINGS, { userId });

    // Delete user
    await deleteItem(TABLES.USERS, { userId });

    return success({ message: 'Account and all data deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return error('Failed to delete account', 500);
  }
}

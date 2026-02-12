const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { TABLES, getItem, scanTable, queryItems, putItem } = require('../utils/dynamodb');

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'ap-south-1' });

/**
 * EventBridge scheduled handler - runs every hour.
 * Checks all users for missed check-ins and triggers alerts.
 */
exports.handler = async (event) => {
  console.log('Monitor check-ins started:', new Date().toISOString());

  let lastKey = null;
  let usersChecked = 0;
  let alertsSent = 0;

  do {
    // Scan all users
    const { items: users, lastKey: nextKey } = await scanTable(TABLES.USERS, { lastKey });
    lastKey = nextKey;

    for (const user of users) {
      usersChecked++;

      try {
        // Get user's settings
        const settings = await getItem(TABLES.SETTINGS, { userId: user.userId });
        if (!settings) continue;

        const threshold = settings.missedDaysThreshold || 2;

        // Calculate days since last check-in
        const daysMissed = getDaysSinceLastCheckIn(user.lastCheckIn);

        if (daysMissed >= threshold) {
          // Check if we already sent alert today
          const today = getTodayIST();
          if (user.lastAlertDate === today) {
            console.log(`Already alerted user ${user.userId} today, skipping`);
            continue;
          }

          // Get contacts
          const { items: contacts } = await queryItems(
            TABLES.CONTACTS, 'userId = :uid', { ':uid': user.userId }
          );

          if (contacts.length === 0) {
            console.log(`User ${user.userId} has no contacts, skipping`);
            continue;
          }

          // Send alerts via ays-send-alert Lambda
          for (const contact of contacts) {
            for (const method of contact.alertMethods) {
              try {
                await lambda.send(new InvokeCommand({
                  FunctionName: `ays-sendAlert${process.env.FUNCTION_SUFFIX || ''}`,
                  InvocationType: 'Event', // async
                  Payload: JSON.stringify({
                    userId: user.userId,
                    contactId: contact.contactId,
                    contactName: contact.name,
                    contactPhone: contact.phone,
                    contactEmail: contact.email,
                    method,
                    daysMissed,
                    senderName: user.displayName || 'A user',
                    customMessage: contact.customMessage,
                  }),
                }));
                alertsSent++;
              } catch (err) {
                console.error(`Failed to invoke alert for ${user.userId}/${contact.contactId}:`, err);
              }
            }
          }

          // Mark that we alerted today
          const { updateItem } = require('../utils/dynamodb');
          await updateItem(TABLES.USERS, { userId: user.userId }, {
            lastAlertDate: today,
          });
        }
      } catch (err) {
        console.error(`Error processing user ${user.userId}:`, err);
      }
    }
  } while (lastKey);

  console.log(`Monitor complete: ${usersChecked} users checked, ${alertsSent} alerts triggered`);

  return { usersChecked, alertsSent };
};

function getDaysSinceLastCheckIn(lastCheckIn) {
  if (!lastCheckIn) return 999;

  const today = new Date(getTodayIST());
  const lastDate = new Date(lastCheckIn);
  const diffMs = today.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

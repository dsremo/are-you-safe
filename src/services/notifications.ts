import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
  RepeatFrequency,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import {NOTIFICATION_IDS} from '../utils/constants';

// Create notification channel for Android
export const createNotificationChannel = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'daily-checkin',
      name: 'Daily Check-in Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: 'emergency-alerts',
      name: 'Emergency Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }
};

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
};

// Schedule daily reminder with "I am safe" action button
export const scheduleDailyReminder = async (
  reminderTime: string,
): Promise<void> => {
  await notifee.cancelTriggerNotification(NOTIFICATION_IDS.DAILY_REMINDER);

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (triggerDate <= now) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: NOTIFICATION_IDS.DAILY_REMINDER,
      title: 'Daily Check-in Reminder',
      body: 'Are you safe? Tap to check in and let your loved ones know you\'re okay.',
      android: {
        channelId: 'daily-checkin',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'I am safe',
            pressAction: {
              id: 'checkin',
            },
          },
        ],
        smallIcon: 'ic_notification',
      },
      ios: {
        sound: 'default',
        categoryId: 'checkin',
      },
    },
    trigger,
  );
};

// Schedule warning notification (after 1 day of no check-in)
export const scheduleWarningNotification = async (
  lastCheckInDate: Date,
): Promise<void> => {
  await notifee.cancelTriggerNotification(NOTIFICATION_IDS.WARNING_NOTIFICATION);

  const warningDate = new Date(lastCheckInDate);
  warningDate.setDate(warningDate.getDate() + 1);
  warningDate.setHours(10, 0, 0, 0);

  if (warningDate <= new Date()) {
    return;
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: warningDate.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id: NOTIFICATION_IDS.WARNING_NOTIFICATION,
      title: 'Warning: 1 Day Since Check-in',
      body: 'You haven\'t checked in for a day! Check in now to avoid alerting your emergency contacts.',
      android: {
        channelId: 'emergency-alerts',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'I am safe',
            pressAction: {
              id: 'checkin',
            },
          },
        ],
        smallIcon: 'ic_notification',
      },
      ios: {
        sound: 'default',
      },
    },
    trigger,
  );
};

// Display immediate notification
export const displayNotification = async (
  title: string,
  body: string,
): Promise<void> => {
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'daily-checkin',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      pressAction: { id: 'default' },
      smallIcon: 'ic_notification',
    },
    ios: {
      sound: 'default',
    },
  });
};

// Cancel all notifications
export const cancelAllNotifications = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
};

// Cancel specific notification
export const cancelNotification = async (id: string): Promise<void> => {
  await notifee.cancelNotification(id);
};

// Get pending notifications
export const getPendingNotifications = async () => {
  return await notifee.getTriggerNotifications();
};

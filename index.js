/**
 * @format
 */

import { AppRegistry, Linking, Platform } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { apiClient, getAuthTokens } from './src/services/api';

// Handle FCM background messages (data-only messages from server)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    const data = remoteMessage.data || {};

    if (data.type === 'send_sms') {
      // Backend is asking us to send SMS from the device
      const phone = data.phone;
      const message = data.message;
      if (phone && message) {
        const smsUrl = Platform.OS === 'android'
          ? `sms:${phone}?body=${encodeURIComponent(message)}`
          : `sms:${phone}&body=${encodeURIComponent(message)}`;

        const channelId = await notifee.createChannel({
          id: 'sms-alert',
          name: 'SMS Alerts',
          importance: 5,
          sound: 'default',
          vibration: true,
        });

        await notifee.displayNotification({
          title: `Send safety alert to ${data.contactName || phone}`,
          body: 'Tap to open SMS and send the emergency alert',
          data: { smsUrl },
          android: {
            channelId,
            pressAction: { id: 'default', launchActivity: 'default' },
            importance: 5,
            sound: 'default',
            smallIcon: 'ic_notification',
          },
        });
      }
    } else if (data.type === 'emergency_alert') {
      const channelId = await notifee.createChannel({
        id: 'emergency',
        name: 'Emergency Alerts',
        importance: 5,
        sound: 'default',
        vibration: true,
      });

      await notifee.displayNotification({
        title: data.title || 'Safety Alert',
        body: data.body || 'Someone needs your help',
        android: {
          channelId,
          importance: 5,
          sound: 'default',
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification',
        },
      });
    }
  } catch (error) {
    console.log('FCM handler error:', error);
  }
});

// Handle notification background events (e.g. "I am safe" action button)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // "I am safe" action button pressed from notification shade
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'checkin') {
    try {
      const tokens = await getAuthTokens();
      if (tokens?.accessToken) {
        await apiClient.checkIn('notification');
      }
    } catch (error) {
      console.log('Background check-in failed:', error);
    }
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    return;
  }

  // Notification body tapped
  if (type === EventType.PRESS) {
    // Handle SMS notification tap - open SMS app
    if (detail.notification?.data?.smsUrl) {
      try {
        await Linking.openURL(detail.notification.data.smsUrl);
      } catch (e) {
        console.log('Failed to open SMS:', e);
      }
    }
    // Dismiss the notification
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }
});

AppRegistry.registerComponent(appName, () => App);

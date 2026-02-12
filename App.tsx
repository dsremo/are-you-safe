/**
 * Are You Safe? - Daily Check-in App
 * A safety app for the Indian audience
 */

import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import notifee, {EventType} from '@notifee/react-native';
import {AuthProvider} from './src/context/AuthContext';
import {AppProvider} from './src/context/AppContext';
import {AppNavigator} from './src/navigation';
import {COLORS} from './src/utils/constants';
import {apiClient, getAuthTokens} from './src/services/api';
import {configureGoogleSignIn} from './src/services/authService';

// Configure Google Sign-In early so the picker opens faster
configureGoogleSignIn();

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App(): React.JSX.Element {
  useEffect(() => {
    // Handle foreground notification events
    return notifee.onForegroundEvent(({type, detail}) => {
      // "I am safe" action button pressed
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'checkin') {
        getAuthTokens().then(tokens => {
          if (tokens?.accessToken) {
            apiClient.checkIn('notification').catch(console.log);
          }
        });
        if (detail.notification?.id) {
          notifee.cancelNotification(detail.notification.id);
        }
      }
      // Notification body tapped - dismiss it (app is already open)
      if (type === EventType.PRESS && detail.notification?.id) {
        notifee.cancelNotification(detail.notification.id);
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />
      <AuthProvider>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

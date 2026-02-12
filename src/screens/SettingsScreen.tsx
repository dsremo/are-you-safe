import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {useAuth} from '../context/AuthContext';
import {COLORS, DEFAULT_SETTINGS, APP_NAME} from '../utils/constants';
import {UserSettings} from '../utils/types';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelAllNotifications,
} from '../services/notifications';

const REMINDER_TIMES = [
  {label: '6:00 AM', value: '06:00'},
  {label: '7:00 AM', value: '07:00'},
  {label: '8:00 AM', value: '08:00'},
  {label: '9:00 AM', value: '09:00'},
  {label: '10:00 AM', value: '10:00'},
  {label: '11:00 AM', value: '11:00'},
  {label: '12:00 PM', value: '12:00'},
  {label: '6:00 PM', value: '18:00'},
  {label: '8:00 PM', value: '20:00'},
  {label: '9:00 PM', value: '21:00'},
];

const THRESHOLD_OPTIONS = [
  {label: '2 days', value: 2},
  {label: '3 days', value: 3},
  {label: '5 days', value: 5},
  {label: '7 days', value: 7},
];

const SettingsScreen: React.FC = () => {
  const {settings, updateSettings} = useApp();
  const {signOut, user} = useAuth();
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [showThresholdOptions, setShowThresholdOptions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleNotifications = async (value: boolean) => {
    setIsUpdating(true);
    try {
      if (value) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            'Permissions Required',
            'Please enable notifications in your device settings to receive reminders.',
          );
          return;
        }
        await scheduleDailyReminder(settings.reminderTime);
      } else {
        await cancelAllNotifications();
      }

      const newSettings: UserSettings = {
        ...settings,
        enableNotifications: value,
      };
      await updateSettings(newSettings);
    } catch {
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSound = async (value: boolean) => {
    const newSettings: UserSettings = {
      ...settings,
      enableSound: value,
    };
    await updateSettings(newSettings);
  };

  const handleSelectTime = async (time: string) => {
    setShowTimeOptions(false);
    setIsUpdating(true);
    try {
      const newSettings: UserSettings = {
        ...settings,
        reminderTime: time,
      };
      await updateSettings(newSettings);

      if (settings.enableNotifications) {
        await scheduleDailyReminder(time);
      }
    } catch {
      Alert.alert('Error', 'Failed to update reminder time');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectThreshold = async (threshold: number) => {
    setShowThresholdOptions(false);
    setIsUpdating(true);
    try {
      const newSettings: UserSettings = {
        ...settings,
        missedDaysThreshold: threshold,
      };
      await updateSettings(newSettings);
    } catch {
      Alert.alert('Error', 'Failed to update threshold');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await updateSettings(DEFAULT_SETTINGS);
            Alert.alert('Success', 'Settings have been reset to default');
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllNotifications();
              await signOut();
            } catch {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ],
    );
  };

  const formatTime = (time: string): string => {
    const found = REMINDER_TIMES.find(t => t.value === time);
    return found ? found.label : time;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          Settings
        </Text>
        <Text style={styles.subtitle}>Configure your app preferences</Text>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive daily reminders to check in
            </Text>
          </View>
          <Switch
            value={settings.enableNotifications}
            onValueChange={handleToggleNotifications}
            trackColor={{false: COLORS.surfaceLight, true: COLORS.primary}}
            thumbColor={COLORS.text}
            disabled={isUpdating}
          />
        </View>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowTimeOptions(!showTimeOptions)}
          disabled={!settings.enableNotifications}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                !settings.enableNotifications && styles.disabledText,
              ]}>
              Reminder Time
            </Text>
            <Text style={styles.settingDescription}>
              When to send daily reminder
            </Text>
          </View>
          <Text style={styles.settingValue}>
            {formatTime(settings.reminderTime)}
          </Text>
        </TouchableOpacity>

        {showTimeOptions && (
          <View style={styles.optionsContainer}>
            {REMINDER_TIMES.map(time => (
              <TouchableOpacity
                key={time.value}
                style={[
                  styles.optionItem,
                  settings.reminderTime === time.value &&
                    styles.optionItemSelected,
                ]}
                onPress={() => handleSelectTime(time.value)}>
                <Text
                  style={[
                    styles.optionText,
                    settings.reminderTime === time.value &&
                      styles.optionTextSelected,
                  ]}>
                  {time.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Sound</Text>
            <Text style={styles.settingDescription}>
              Play sound for notifications
            </Text>
          </View>
          <Switch
            value={settings.enableSound}
            onValueChange={handleToggleSound}
            trackColor={{false: COLORS.surfaceLight, true: COLORS.primary}}
            thumbColor={COLORS.text}
          />
        </View>
      </View>

      {/* Alert Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Settings</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowThresholdOptions(!showThresholdOptions)}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Alert After</Text>
            <Text style={styles.settingDescription}>
              Days without check-in before alerting contacts
            </Text>
          </View>
          <Text style={styles.settingValue}>
            {settings.missedDaysThreshold} days
          </Text>
        </TouchableOpacity>

        {showThresholdOptions && (
          <View style={styles.optionsContainer}>
            {THRESHOLD_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  settings.missedDaysThreshold === option.value &&
                    styles.optionItemSelected,
                ]}
                onPress={() => handleSelectThreshold(option.value)}>
                <Text
                  style={[
                    styles.optionText,
                    settings.missedDaysThreshold === option.value &&
                      styles.optionTextSelected,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={handleResetSettings}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Reset Settings</Text>
            <Text style={styles.settingDescription}>
              Reset all settings to default values
            </Text>
          </View>
          <Text style={[styles.settingValue, {color: COLORS.warning}]}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      {/* Widget Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Home Screen Widget</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Add Check-in Widget</Text>
            <Text style={styles.settingDescription}>
              Quick check-in from your home screen without opening the app
            </Text>
          </View>
        </View>
        <View style={styles.widgetInstructions}>
          <Text style={styles.widgetStep}>1. Long press on your home screen</Text>
          <Text style={styles.widgetStep}>2. Tap "Widgets"</Text>
          <Text style={styles.widgetStep}>3. Search for "Are You Safe"</Text>
          <Text style={styles.widgetStep}>4. Drag the widget to your home screen</Text>
        </View>
      </View>

      {/* Legal & About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About & Legal</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            Alert.alert(
              'Privacy Policy',
              'Your privacy matters to us.\n\n' +
              'DATA WE COLLECT:\n' +
              '- Emergency contact names, phone numbers, emails\n' +
              '- Check-in dates and history\n' +
              '- App settings and preferences\n' +
              '- Google account info for authentication\n\n' +
              'HOW WE USE IT:\n' +
              '- Data is stored securely on our servers\n' +
              '- We do NOT share your data with third parties\n' +
              '- Alerts are sent via our server (SMS/Email)\n\n' +
              'DATA SECURITY:\n' +
              '- Data is encrypted in transit\n' +
              '- Deleting your account removes all data\n\n' +
              'PERMISSIONS:\n' +
              '- Notifications: For daily check-in reminders\n' +
              '- Internet: To communicate with our servers',
              [{text: 'OK'}],
            );
          }}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.settingDescription}>
              How we handle your data
            </Text>
          </View>
          <Text style={styles.settingValue}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            Alert.alert(
              'Terms of Service',
              'BY USING THIS APP, YOU AGREE TO:\n\n' +
              '1. USE RESPONSIBLY\n' +
              'This app is for personal safety purposes. Do not use it to spam or harass others.\n\n' +
              '2. EMERGENCY CONTACTS\n' +
              'Only add contacts who have consented to receive emergency alerts from you.\n\n' +
              '3. NO WARRANTY\n' +
              'This app is provided "as is". We are not responsible for failed alerts due to network issues or other factors.\n\n' +
              '4. AGE REQUIREMENT\n' +
              'You must be 13 years or older to use this app.',
              [{text: 'I Agree'}],
            );
          }}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.settingDescription}>
              Usage terms and conditions
            </Text>
          </View>
          <Text style={styles.settingValue}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            Alert.alert(
              'Data Collection Notice',
              'This app:\n\n' +
              '- Stores your data securely on AWS servers\n' +
              '- Does NOT collect analytics or tracking data\n' +
              '- Does NOT share data with third parties\n' +
              '- Does NOT have ads\n\n' +
              'Your data belongs to you. Delete your account to remove everything.',
              [{text: 'OK'}],
            );
          }}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Data Safety</Text>
            <Text style={styles.settingDescription}>
              What data we collect and store
            </Text>
          </View>
          <Text style={styles.settingValue}>View</Text>
        </TouchableOpacity>

        <View style={styles.aboutContainer}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.appVersion}>Version 2.0.0</Text>
          {user?.email && (
            <Text style={styles.userEmail}>Signed in as {user.email}</Text>
          )}
          <Text style={styles.appDescription}>
            A daily check-in app for your peace of mind. If you don't check in
            for {settings.missedDaysThreshold} days, your emergency contacts
            will be notified via SMS and Email.
          </Text>
          <Text style={styles.madeIn}>Made with care in India</Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    padding: 15,
    backgroundColor: COLORS.surfaceLight,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  disabledText: {
    color: COLORS.textSecondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  optionItem: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  widgetInstructions: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 6,
  },
  widgetStep: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  aboutContainer: {
    padding: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  madeIn: {
    fontSize: 14,
    color: COLORS.text,
  },
  signOutButton: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: `${COLORS.danger}20`,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});

export default SettingsScreen;

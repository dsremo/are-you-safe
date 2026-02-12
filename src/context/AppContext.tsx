import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {Alert} from 'react-native';
import {apiClient} from '../services/api';
import {useAuth} from './AuthContext';
import {
  EmergencyContact,
  UserSettings,
  CheckInRecord,
  AppState,
} from '../utils/types';
import {DEFAULT_SETTINGS} from '../utils/constants';
import {
  createNotificationChannel,
  requestNotificationPermissions,
  scheduleDailyReminder,
  scheduleWarningNotification,
  cancelAllNotifications,
} from '../services/notifications';
import {
  queueOfflineCheckIn,
  syncPendingCheckIn,
  startConnectivityListener,
} from '../services/offlineQueue';

interface AppContextType extends AppState {
  loading: boolean;
  checkIn: () => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  updateEmergencyContact: (contact: EmergencyContact) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  loading: true,
  lastCheckIn: null,
  emergencyContacts: [],
  settings: DEFAULT_SETTINGS,
  isOnboardingComplete: true,
  checkInHistory: [],
  checkIn: async () => {},
  addEmergencyContact: async () => {},
  updateEmergencyContact: async () => {},
  removeEmergencyContact: async () => {},
  updateSettings: async () => {},
  refreshData: async () => {},
});

export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const {user, isAuthenticated} = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);

  const connectivityUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      initializeApp();

      // Start listening for connectivity changes to sync offline check-ins
      connectivityUnsubRef.current = startConnectivityListener(() => {
        // Offline check-in synced successfully - refresh data
        refreshData();
      });
    } else {
      setLoading(false);
    }

    return () => {
      connectivityUnsubRef.current?.();
    };
  }, [isAuthenticated]);

  const initializeApp = async () => {
    try {
      await createNotificationChannel();

      // Sync any pending offline check-ins first
      await syncPendingCheckIn();

      // Fetch all data from server in parallel
      const [userRes, settingsRes, contactsRes, historyRes] = await Promise.allSettled([
        apiClient.getUser(),
        apiClient.getSettings(),
        apiClient.getContacts(),
        apiClient.getHistory(30),
      ]);

      // User data
      if (userRes.status === 'fulfilled') {
        const userData = userRes.value.data;
        setLastCheckIn(userData.lastCheckIn || null);

        // Auto-mark onboarding complete for new users
        if (!userData.onboardingComplete) {
          apiClient.updateUser({onboardingComplete: true}).catch(() => {});
        }
      }

      // Settings - always request notification permissions
      await requestNotificationPermissions();

      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data;
        setSettings({
          reminderTime: s.reminderTime || DEFAULT_SETTINGS.reminderTime,
          missedDaysThreshold: s.missedDaysThreshold || DEFAULT_SETTINGS.missedDaysThreshold,
          enableNotifications: s.enableNotifications ?? DEFAULT_SETTINGS.enableNotifications,
          enableSound: s.enableSound ?? DEFAULT_SETTINGS.enableSound,
        });

        // Schedule notification if enabled
        if (s.enableNotifications !== false) {
          await scheduleDailyReminder(s.reminderTime || '09:00');
        }
      } else {
        // Even if settings fetch failed, schedule with defaults
        await scheduleDailyReminder(DEFAULT_SETTINGS.reminderTime);
      }

      // Contacts
      if (contactsRes.status === 'fulfilled') {
        const contacts = contactsRes.value.data.contacts.map((c: any) => ({
          id: c.contactId,
          contactId: c.contactId,
          name: c.name,
          phone: c.phone,
          email: c.email,
          alertMethods: c.alertMethods,
          customMessage: c.customMessage || '',
        }));
        setEmergencyContacts(contacts);
      }

      // History
      if (historyRes.status === 'fulfilled') {
        setCheckInHistory(historyRes.value.data.checkIns || []);
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIn = useCallback(async () => {
    try {
      const response = await apiClient.checkIn('app');
      const {date, timestamp} = response.data;
      setLastCheckIn(date);
      setCheckInHistory(prev => [{date, timestamp, source: 'app'}, ...prev]);

      // Schedule warning notification for tomorrow if no check-in
      scheduleWarningNotification(new Date()).catch(() => {});
    } catch (error: any) {
      // Check if it's a network error (offline)
      if (!error.response && (error.message?.includes('Network') || error.code === 'ERR_NETWORK')) {
        // Queue check-in for when internet comes back
        await queueOfflineCheckIn('app');

        // Update UI optimistically - show today's date
        const today = new Date().toISOString().split('T')[0];
        setLastCheckIn(today);
        setCheckInHistory(prev => [{date: today, timestamp: Date.now(), source: 'app'}, ...prev]);
        scheduleWarningNotification(new Date()).catch(() => {});

        // Don't throw - we handled it
        Alert.alert(
          'Checked In Offline',
          'No internet right now. Your check-in is saved and will sync automatically when you\'re back online.',
        );
        return;
      }
      throw error;
    }
  }, []);

  const addEmergencyContact = useCallback(async (contactData: Omit<EmergencyContact, 'id'>) => {
    try {
      const response = await apiClient.addContact(contactData);
      const newContact: EmergencyContact = {
        id: response.data.contactId,
        contactId: response.data.contactId,
        ...contactData,
      } as EmergencyContact;
      setEmergencyContacts(prev => [...prev, newContact]);
    } catch (error) {
      console.error('Add contact error:', error);
      throw error;
    }
  }, []);

  const updateEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    try {
      const contactId = contact.contactId || contact.id;
      await apiClient.updateContact(contactId, {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        alertMethods: contact.alertMethods,
        customMessage: contact.customMessage,
      });
      setEmergencyContacts(prev =>
        prev.map(c => (c.id === contact.id ? contact : c)),
      );
    } catch (error) {
      console.error('Update contact error:', error);
      throw error;
    }
  }, []);

  const removeEmergencyContact = useCallback(async (id: string) => {
    try {
      await apiClient.deleteContact(id);
      setEmergencyContacts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Remove contact error:', error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      await apiClient.updateSettings(newSettings);
      setSettings(newSettings);

      // Update local notifications
      if (newSettings.enableNotifications) {
        await scheduleDailyReminder(newSettings.reminderTime);
      } else {
        await cancelAllNotifications();
      }
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }, []);

  const refreshData = useCallback(async () => {
    await initializeApp();
  }, []);

  return (
    <AppContext.Provider
      value={{
        loading,
        lastCheckIn,
        emergencyContacts,
        settings,
        isOnboardingComplete: true,
        checkInHistory,
        checkIn,
        addEmergencyContact,
        updateEmergencyContact,
        removeEmergencyContact,
        updateSettings,
        refreshData,
      }}>
      {children}
    </AppContext.Provider>
  );
};

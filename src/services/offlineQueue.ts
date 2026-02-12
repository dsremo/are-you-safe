import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {apiClient} from './api';

const PENDING_CHECKIN_KEY = '@pending_checkin';

interface PendingCheckIn {
  timestamp: number;
  source: string;
}

/**
 * Save a check-in locally when offline.
 * Stores the timestamp so the server knows when it actually happened.
 */
export const queueOfflineCheckIn = async (source: string): Promise<void> => {
  const pending: PendingCheckIn = {
    timestamp: Date.now(),
    source,
  };
  await AsyncStorage.setItem(PENDING_CHECKIN_KEY, JSON.stringify(pending));
};

/**
 * Try to sync any pending offline check-in to the server.
 * Returns true if synced successfully or nothing was pending.
 */
export const syncPendingCheckIn = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CHECKIN_KEY);
    if (!raw) return true; // Nothing pending

    const pending: PendingCheckIn = JSON.parse(raw);

    // Send to server
    await apiClient.checkIn(pending.source);

    // Clear pending
    await AsyncStorage.removeItem(PENDING_CHECKIN_KEY);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if there's a pending offline check-in.
 */
export const hasPendingCheckIn = async (): Promise<boolean> => {
  const raw = await AsyncStorage.getItem(PENDING_CHECKIN_KEY);
  return !!raw;
};

/**
 * Start listening for connectivity changes.
 * When internet comes back, auto-sync pending check-ins.
 * Returns an unsubscribe function.
 */
export const startConnectivityListener = (
  onSynced?: () => void,
): (() => void) => {
  const unsubscribe = NetInfo.addEventListener(async state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      const hadPending = await hasPendingCheckIn();
      if (hadPending) {
        const synced = await syncPendingCheckIn();
        if (synced && onSynced) {
          onSynced();
        }
      }
    }
  });

  return unsubscribe;
};

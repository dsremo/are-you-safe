import {ALERT_METHODS} from './constants';

export type AlertMethod = (typeof ALERT_METHODS)[keyof typeof ALERT_METHODS];

export interface EmergencyContact {
  id: string;
  contactId?: string; // Server-side ID
  name: string;
  phone: string;
  email: string;
  alertMethods: AlertMethod[];
  customMessage: string;
}

export interface UserSettings {
  reminderTime: string;
  missedDaysThreshold: number;
  enableNotifications: boolean;
  enableSound: boolean;
}

export interface CheckInRecord {
  date: string;
  timestamp: number;
  source?: string;
}

export interface AppState {
  lastCheckIn: string | null;
  emergencyContacts: EmergencyContact[];
  settings: UserSettings;
  isOnboardingComplete: boolean;
  checkInHistory: CheckInRecord[];
}

export interface User {
  userId: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  onboardingComplete?: boolean;
  lastCheckIn?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  AddContact: {contact?: EmergencyContact};
};

export type MainTabParamList = {
  Home: undefined;
  Contacts: undefined;
  History: undefined;
  Settings: undefined;
};

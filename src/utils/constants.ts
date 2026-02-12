// App Constants
export const APP_NAME = 'Are You Safe?';

export const STORAGE_KEYS = {
  AUTH_TOKENS: '@auth_tokens',
  ONBOARDING_COMPLETE: '@onboarding_complete',
  CACHED_USER: '@cached_user',
};

export const NOTIFICATION_IDS = {
  DAILY_REMINDER: 'daily-reminder',
  WARNING_NOTIFICATION: 'warning-notification',
  EMERGENCY_ALERT: 'emergency-alert',
};

export const ALERT_METHODS = {
  SMS: 'sms',
  EMAIL: 'email',
} as const;

export const DEFAULT_SETTINGS = {
  reminderTime: '09:00',
  missedDaysThreshold: 2,
  enableNotifications: true,
  enableSound: true,
};

export const COLORS = {
  primary: '#FF6B6B',
  primaryDark: '#EE5A5A',
  secondary: '#4ECDC4',
  background: '#1A1A2E',
  surface: '#16213E',
  surfaceLight: '#0F3460',
  text: '#FFFFFF',
  textSecondary: '#B8B8B8',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  safe: '#4CAF50',
  unsafe: '#F44336',
};

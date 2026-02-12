import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import messaging from '@react-native-firebase/messaging';
import {ENV} from '../config/env';
import {apiClient, saveAuthTokens, clearAuthTokens, getAuthTokens} from './api';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
  });
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{
  userId: string;
  email: string;
  displayName: string;
  isNewUser: boolean;
} | null> => {
  try {
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

    // Send to backend immediately without waiting for FCM token
    const result = await apiClient.signInWithGoogle(idToken);
    const {userId, email, displayName, isNewUser, tokens} = result.data;

    // Store tokens
    await saveAuthTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    // Get FCM token in background (non-blocking)
    updateFcmToken().catch(() => {});

    return {userId, email, displayName, isNewUser};
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available');
    }
    throw error;
  }
};

// Update FCM token in background after login
const updateFcmToken = async () => {
  try {
    await messaging().requestPermission();
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await apiClient.updateUser({fcmToken});
    }
  } catch (e) {
    // Non-fatal - will retry on next app launch
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.log('Google sign out error (non-fatal):', error);
  }
  await clearAuthTokens();
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const tokens = await getAuthTokens();
  return !!tokens?.accessToken;
};

// Get current user from API
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.getUser();
    return response.data;
  } catch (error) {
    return null;
  }
};

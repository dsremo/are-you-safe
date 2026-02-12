import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ENV} from '../config/env';

const AUTH_TOKENS_KEY = '@auth_tokens';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokensStr = await AsyncStorage.getItem(AUTH_TOKENS_KEY);
    if (tokensStr) {
      const tokens: AuthTokens = JSON.parse(tokensStr);
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor - handle 401 (token expired)
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokensStr = await AsyncStorage.getItem(AUTH_TOKENS_KEY);
        if (tokensStr) {
          const tokens: AuthTokens = JSON.parse(tokensStr);
          const response = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });

          const newTokens = {
            ...tokens,
            accessToken: response.data.accessToken,
            expiresIn: response.data.expiresIn || tokens.expiresIn,
          };
          await AsyncStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(newTokens));

          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - user needs to login again
        await AsyncStorage.removeItem(AUTH_TOKENS_KEY);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Auth token management
export const saveAuthTokens = async (tokens: AuthTokens): Promise<void> => {
  await AsyncStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(tokens));
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  const str = await AsyncStorage.getItem(AUTH_TOKENS_KEY);
  return str ? JSON.parse(str) : null;
};

export const clearAuthTokens = async (): Promise<void> => {
  await AsyncStorage.removeItem(AUTH_TOKENS_KEY);
};

// API methods
export const apiClient = {
  // Auth
  signInWithGoogle: (idToken: string, fcmToken?: string) =>
    api.post('/auth/google', {idToken, fcmToken}),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', {refreshToken}),

  // Check-in
  checkIn: (source: string = 'app') =>
    api.post('/checkin', {source}),

  // Contacts
  getContacts: () => api.get('/contacts'),
  addContact: (data: any) => api.post('/contacts', data),
  updateContact: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  deleteContact: (id: string) => api.delete(`/contacts/${id}`),
  testAlert: (id: string, method: string) =>
    api.post(`/contacts/${id}/test`, {method}),

  // Settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),

  // History
  getHistory: (limit: number = 30, lastKey?: string) =>
    api.get('/history', {params: {limit, lastKey}}),

  // User
  getUser: () => api.get('/user'),
  updateUser: (data: any) => api.put('/user', data),
  deleteUser: () => api.delete('/user'),
};

export default api;

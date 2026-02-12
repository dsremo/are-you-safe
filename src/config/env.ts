import Config from 'react-native-config';

export const ENV = {
  API_BASE_URL: Config.API_BASE_URL || 'http://10.0.2.2:3000/dev',
  GOOGLE_WEB_CLIENT_ID: Config.GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: Config.GOOGLE_ANDROID_CLIENT_ID || '',
  ENVIRONMENT: Config.ENVIRONMENT || 'development',
  AWS_REGION: Config.AWS_REGION || 'ap-south-1',
  isDevelopment: Config.ENVIRONMENT === 'development',
  isStaging: Config.ENVIRONMENT === 'staging',
  isProduction: Config.ENVIRONMENT === 'production',
};

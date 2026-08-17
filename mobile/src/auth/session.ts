/**
 * Storage helpers for Expo later:
 *   import * as SecureStore from 'expo-secure-store';
 *
 * Never use AsyncStorage for tokens on a production app.
 */
export const TOKEN_KEYS = {
  access: 'daronotha.accessToken',
  refresh: 'daronotha.refreshToken',
  deviceId: 'daronotha.deviceId',
} as const;

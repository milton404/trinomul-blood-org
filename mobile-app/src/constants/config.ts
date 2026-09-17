import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PROD_API_URL = 'https://trinomul.vercel.app';

/**
 * Resolve the dev API URL dynamically.
 * - On Android emulator, 10.0.2.2 maps to the host machine's localhost.
 * - On iOS simulator, localhost works directly.
 * - Override via app.json `extra.apiUrl` for physical devices (set your LAN IP).
 */
function resolveDevApiUrl(): string {
  const override = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (override && override.trim()) return override.trim();

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE_URL = __DEV__ ? resolveDevApiUrl() : PROD_API_URL;

export const API_TIMEOUT_MS = 8000;

export const IS_ANDROID = Platform.OS === 'android';

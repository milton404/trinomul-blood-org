import { Platform } from 'react-native';

const DEV_API_URL = 'http://10.111.60.65:3000';
const PROD_API_URL = 'https://trinomul-blood-bank-rangpur.vercel.app';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const API_TIMEOUT_MS = 8000;

export const IS_ANDROID = Platform.OS === 'android';

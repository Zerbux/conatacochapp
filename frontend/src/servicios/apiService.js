import { Platform } from 'react-native';
import { getSessionToken } from './sessionService';

const DEFAULT_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://127.0.0.1:8000';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL;

export async function apiRequest(path, options = {}) {
  const { skipAuth = false, ...requestOptions } = options;
  const token = skipAuth ? null : await getSessionToken();
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}${path}`, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...requestOptions.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null
      ? body.error || body.detail || JSON.stringify(body)
      : body;
    throw new Error(detail || `El servidor respondió con estado ${response.status}.`);
  }

  return body;
}

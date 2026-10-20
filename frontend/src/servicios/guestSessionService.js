import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './apiService';
import { DEMO_MODE } from './authService';
import { getSessionToken, saveSessionToken } from './sessionService';

const INSTALLATION_ID_KEY = 'conatacoch-installation-id';
let pendingInitialization = null;

export async function ensureTemporarySession() {
  if (DEMO_MODE || await getSessionToken()) return;
  if (pendingInitialization) return pendingInitialization;

  pendingInitialization = createTemporarySession();
  try {
    await pendingInitialization;
  } finally {
    pendingInitialization = null;
  }
}

async function createTemporarySession() {
  const installationId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  const response = await apiRequest('/api/usuario-temporal/', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(installationId ? { installation_id: installationId } : {}),
  });
  if (!response.key || !response.installation_id) {
    throw new Error('El servidor no devolvio una sesion temporal valida.');
  }
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, response.installation_id);
  await saveSessionToken(response.key);
}

import { Platform } from 'react-native';
import { getSessionToken } from './sessionService';

const DEFAULT_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://127.0.0.1:8000';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL;

export async function apiRequest(path, options = {}) {
  const { skipAuth = false, timeoutMs = 15000, ...requestOptions } = options;
  const token = skipAuth ? null : await getSessionToken();
  const isMultipart = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;
  const externalSignal = requestOptions.signal;
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener('abort', abortRequest, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(API_BASE_URL.replace(/\/$/, '') + path, {
        ...requestOptions,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: 'Token ' + token } : {}),
          ...requestOptions.headers,
        },
      });
    } catch (error) {
      if (externalSignal?.aborted) throw error;
      if (controller.signal.aborted) {
        throw new Error('El servidor tardó demasiado en responder. Comprueba la conexión y vuelve a intentarlo.');
      }
      if (error instanceof TypeError) {
        throw new Error('No se pudo conectar con el servidor. Revisa la URL y que el teléfono y el equipo estén en la misma red.');
      }
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const detail = typeof body === 'object' && body !== null
        ? body.error || body.detail || JSON.stringify(body)
        : body;
      throw new Error(detail || ('El servidor respondió con estado ' + response.status + '.'));
    }

    return body;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortRequest);
  }
}
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('Configura EXPO_PUBLIC_API_URL antes de conectar el frontend con el servidor.');
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
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

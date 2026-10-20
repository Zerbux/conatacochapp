import { apiRequest } from './apiService';
import { clearSessionToken, getSessionToken, saveSessionToken } from './sessionService';

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const DEMO_ACCOUNTS = {
  REGISTRADO: {
    credential: 'pasajero-demo',
    password: 'DEMO-ONLY',
    user: {
      id: 'USR-DEMO-001',
      identificador: 'USR-DEMO-001',
      nombre: 'Pasajero DEMO',
      tipo_usuario: 'REGISTRADO',
      correo: 'pasajero-demo@example.test',
    },
  },
  CONDUCTOR: {
    credential: 'conductor-demo',
    password: 'CHOFER-ONLY',
    user: {
      id: 'COND-DEMO-001',
      nombre: 'Conductor DEMO 01',
      identificador: 'COND-DEMO-001',
      tipo_usuario: 'CONDUCTOR',
      correo: 'conductor-demo-01@example.test',
    },
  },
  ADMIN: {
    credential: 'admin-demo',
    password: 'ADMIN-ONLY',
    user: {
      id: 'ADMIN-DEMO-001',
      nombre: 'Administrador DEMO',
      identificador: 'ADMIN-DEMO-001',
      tipo_usuario: 'ADMIN',
      correo: 'admin-demo@example.test',
    },
  },
};

export async function loginWithRole(role, credential, password) {
  if (DEMO_MODE) {
    const account = DEMO_ACCOUNTS[role || 'REGISTRADO'];
    if (
      !account ||
      credential.trim().toLowerCase() !== account.credential ||
      password !== account.password
    ) {
      throw new Error('Credenciales DEMO incorrectas. Revisa los datos de demostración.');
    }
    return { ...account.user, modo: 'MOCK' };
  }

  const payload = { credencial: credential, password };
  if (role) payload.role = role;
  const response = await apiRequest('/api/login/', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(payload),
  });
  if (!response.key) {
    throw new Error('El servidor no devolvió un token de sesión válido.');
  }
  await saveSessionToken(response.key);
  return { ...response, modo: 'API' };
}

export async function logout() {
  try {
    if (!DEMO_MODE) {
      const token = await getSessionToken();
      if (token) await apiRequest('/api/logout/', { method: 'POST' });
    }
  } finally {
    await clearSessionToken();
  }
}

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

const DEMO_ACCOUNTS = {
  CONDUCTOR: {
    credential: 'conductor-demo',
    password: 'DEMO-ONLY',
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
    password: 'DEMO-ONLY',
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
    const account = DEMO_ACCOUNTS[role];
    if (
      !account ||
      credential.trim().toLowerCase() !== account.credential ||
      password !== account.password
    ) {
      throw new Error('Credenciales DEMO incorrectas. Revisa los datos de demostración.');
    }
    return { ...account.user, modo: 'MOCK' };
  }

  throw new Error(
    'El servidor actual no emite sesiones seguras ni protege sus endpoints por rol. El acceso real queda bloqueado hasta implementar permisos y tokens en Django.',
  );
}

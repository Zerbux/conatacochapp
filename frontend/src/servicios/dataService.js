import { apiRequest } from './apiService';
import { DEMO_MODE } from './authService';
import {
  createMockRecord,
  listMockRecords,
  updateMockRecord,
} from './mockService';

const API_COLLECTIONS = {
  usuarios: 'usuarios',
  conductores: 'conductores',
  vehiculos: 'vehiculos',
  rutas: 'rutas',
  ubicaciones: 'ubicaciones',
  solicitudes: 'solicitudes',
  viajes: 'viajes',
  calificaciones: 'calificaciones',
};

const getApiCollection = (collection) => {
  const endpoint = API_COLLECTIONS[collection];
  if (!endpoint) {
    throw new Error(`El servidor aún no tiene un endpoint configurado para "${collection}".`);
  }
  return endpoint;
};

export async function listRecords(collection) {
  if (DEMO_MODE) return listMockRecords(collection);
  const endpoint = getApiCollection(collection);
  const response = await apiRequest(`/api/${endpoint}/`);
  if (!Array.isArray(response)) {
    throw new Error(`El endpoint de ${collection} no devolvió una lista válida.`);
  }
  return response;
}

export async function createRecord(collection, record) {
  if (DEMO_MODE) return createMockRecord(collection, record);
  const endpoint = getApiCollection(collection);
  const payload = collection === 'usuarios'
    ? { ...record, username: record.username || record.identificador || record.correo }
    : record;
  return apiRequest(`/api/${endpoint}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRecord(collection, id, changes) {
  if (DEMO_MODE) return updateMockRecord(collection, id, changes);
  const endpoint = getApiCollection(collection);
  return apiRequest(`/api/${endpoint}/${encodeURIComponent(id)}/`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export async function setRecordActive(collection, id, active) {
  if (DEMO_MODE) {
    const changes = { estado: active ? 'ACTIVO' : 'INACTIVO' };
    const records = await listMockRecords(collection);
    const record = records.find((item) => String(item.id) === String(id));
    if (record && 'activo' in record) changes.activo = active;
    return updateMockRecord(collection, id, changes);
  }
  return updateRecord(
    collection,
    id,
    collection === 'usuarios' ? { is_active: active } : { estado: active ? 'ACTIVO' : 'INACTIVO' },
  );
}

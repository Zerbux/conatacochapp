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
  licencias: 'licencias',
  vehiculos: 'vehiculos',
  rutas: 'rutas',
  vehiculoRuta: 'vehiculo-ruta',
  trazadosRuta: 'trazados-ruta',
  ubicaciones: 'ubicaciones',
  solicitudes: 'solicitudes',
  viajes: 'viajes',
  calificaciones: 'calificaciones',
  emergencias: 'emergencias',
  notificaciones: 'notificaciones',
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
  const payload = toApiPayload(collection, record);
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
    body: JSON.stringify(toApiPayload(collection, changes)),
  });
}

function toApiPayload(collection, record) {
  const payload = { ...record };
  if (collection === 'usuarios') {
    payload.username = payload.username || payload.email || payload.identificador;
  }
  if (collection === 'solicitudes') {
    if (payload.asientos != null) {
      payload.cantidad_asientos = Number(payload.asientos);
      delete payload.asientos;
    }
    delete payload.pasajero;
    delete payload.conductor;
    delete payload.puntoRecogida;
    delete payload.ruta_folio;
    delete payload.ruta_nombre;
  }
  if (collection === 'viajes') {
    delete payload.pasajero;
    delete payload.conductor;
    delete payload.vehiculo;
    delete payload.ruta;
    delete payload.asientos;
    delete payload.inicio;
    delete payload.fin;
  }
  if (collection === 'vehiculoRuta') {
    delete payload.patente;
    delete payload.folio;
    delete payload.conductor;
  }
  if (collection === 'trazadosRuta') delete payload.id;
  if (collection === 'vehiculos') delete payload.conductor_nombre;
  if (collection === 'rutas') delete payload.trazados;
  if (collection === 'notificaciones') {
    delete payload.fecha;
  }
  return payload;
}

export async function setRecordActive(collection, id, active) {
  if (DEMO_MODE) {
    const activeState = collection === 'rutas' ? 'ACTIVA' : 'ACTIVO';
    const changes = { estado: active ? activeState : 'INACTIVO' };
    const records = await listMockRecords(collection);
    const record = records.find((item) => String(item.id) === String(id));
    if (record && 'activo' in record) changes.activo = active;
    return updateMockRecord(collection, id, changes);
  }
  return updateRecord(
    collection,
    id,
    collection === 'usuarios'
      ? { is_active: active }
      : collection === 'vehiculoRuta'
        ? { activo: active }
        : { estado: active ? (collection === 'rutas' ? 'ACTIVA' : 'ACTIVO') : 'INACTIVO' },
  );
}

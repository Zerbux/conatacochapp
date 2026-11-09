import { Platform } from 'react-native';
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

export async function listRecords(collection, requestOptions = {}) {
  if (DEMO_MODE) return listMockRecords(collection);
  const endpoint = getApiCollection(collection);
  const response = await apiRequest(`/api/${endpoint}/`, requestOptions);
  if (!Array.isArray(response)) {
    throw new Error(`El endpoint de ${collection} no devolvió una lista válida.`);
  }
  return response;
}

export async function createRecord(collection, record) {
  if (DEMO_MODE) return createMockRecord(collection, record);
  const endpoint = getApiCollection(collection);
  if (collection === 'rutas' && (record.imagen_archivo || record.eliminar_imagen)) {
    return apiRequest(`/api/${endpoint}/`, {
      method: 'POST',
      body: await buildRouteFormData(record),
    });
  }
  const payload = toApiPayload(collection, record);
  return apiRequest(`/api/${endpoint}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRecord(collection, id, changes) {
  if (DEMO_MODE) return updateMockRecord(collection, id, changes);
  const endpoint = getApiCollection(collection);
  if (collection === 'rutas' && (changes.imagen_archivo || changes.eliminar_imagen)) {
    return apiRequest(`/api/${endpoint}/${encodeURIComponent(id)}/`, {
      method: 'PATCH',
      body: await buildRouteFormData(changes),
    });
  }
  return apiRequest(`/api/${endpoint}/${encodeURIComponent(id)}/`, {
    method: 'PATCH',
    body: JSON.stringify(toApiPayload(collection, changes)),
  });
}

async function buildRouteFormData(record) {
  const form = new FormData();
  const { imagen_archivo, imagen, trazados, calles_ida, calles_regreso, calles_ida_alternativa,
    calles_regreso_alternativa, eliminar_imagen, ...fields } = record;
  Object.entries(fields).forEach(([key, value]) => {
    if (value != null) form.append(key, String(value));
  });
  if (eliminar_imagen) form.append('eliminar_imagen', 'true');
  if (imagen_archivo) {
    const extension = imagen_archivo.mimeType === 'image/png' ? 'png'
      : imagen_archivo.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const name = imagen_archivo.fileName || ('ruta-' + Date.now() + '.' + extension);
    if (Platform.OS === 'web') {
      const file = imagen_archivo.file || await fetch(imagen_archivo.uri).then((response) => response.blob());
      form.append('imagen', file, name);
    } else {
      form.append('imagen', {
        uri: imagen_archivo.uri,
        name,
        type: imagen_archivo.mimeType || 'image/jpeg',
      });
    }
  }
  return form;
}

export async function planificarRuta(origen, destino) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await apiRequest('/api/rutas/planificar/', {
      method: 'POST',
      body: JSON.stringify({ origen, destino }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('El cálculo tardó demasiado. Revisa tu conexión e inténtalo de nuevo.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listRouteTraces(routeId) {
  if (DEMO_MODE) {
    return (await listMockRecords('trazadosRuta')).filter((point) => String(point.ruta) === String(routeId));
  }
  const response = await apiRequest(`/api/trazados-ruta/?ruta=${encodeURIComponent(routeId)}`);
  if (!Array.isArray(response)) throw new Error('El servidor no devolvió una lista válida de puntos.');
  return response;
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
  if (collection === 'rutas') {
    delete payload.imagen;
    delete payload.imagen_archivo;
    delete payload.trazados;
    delete payload.calles_ida;
    delete payload.calles_regreso;
    delete payload.calles_ida_alternativa;
    delete payload.calles_regreso_alternativa;
  }
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

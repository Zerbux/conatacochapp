import { rutasConatacoch } from '../pantallas/rutasConatacoch';

export const MOCK_USERS = [
  {
    id: 'USR-DEMO-001',
    identificador: 'USR-DEMO-001',
    nombre: 'Usuario DEMO 01',
    correo: 'usuario-demo-01@example.test',
    telefono: 'No disponible DEMO',
    tipo: 'REGISTRADO',
    fechaCreacion: '2026-01-10',
    ultimaActividad: '2026-01-10',
    estado: 'ACTIVO',
    installation_id: null,
  },
  {
    id: 'USR-TEMP-DEMO-002',
    identificador: 'USR-TEMP-DEMO-002',
    nombre: 'Usuario temporal DEMO',
    correo: 'No disponible DEMO',
    telefono: 'No disponible DEMO',
    tipo: 'TEMPORAL',
    fechaCreacion: '2026-01-11',
    ultimaActividad: '2026-01-11',
    estado: 'ACTIVO',
    installation_id: 'INSTALLATION-DEMO-002',
  },
  {
    id: 'ADMIN-DEMO-001',
    identificador: 'ADMIN-DEMO-001',
    nombre: 'Administrador DEMO',
    correo: 'admin-demo@example.test',
    telefono: 'No disponible DEMO',
    tipo: 'ADMIN',
    fechaCreacion: '2026-01-01',
    ultimaActividad: '2026-01-11',
    estado: 'ACTIVO',
    installation_id: null,
  },
];

export const MOCK_DRIVERS = [
  {
    id: 'COND-DEMO-001',
    rut: 'RUT DEMO 001',
    nombre: 'Conductor DEMO 01',
    direccion: 'Dirección DEMO',
    comuna: 'Comuna DEMO',
    fono_celular: 'No disponible DEMO',
    fono_fijo: 'No disponible DEMO',
    fono_emergencia: 'No disponible DEMO',
    correo: 'conductor-demo-01@example.test',
    estado: 'ACTIVO',
    biometria_activa: false,
    usuario: 'USR-COND-DEMO-001',
    licencia_id: 'LIC-DEMO-001',
    vehiculo_id: 'VEH-DEMO-001',
  },
];

export const MOCK_LICENSES = [
  {
    id: 'LIC-DEMO-001',
    conductor: 'Conductor DEMO 01',
    clase: 'A2',
    fecha_emision: '2024-01-01',
    comuna_emision: 'Comuna DEMO',
    fecha_vencimiento: '2027-01-01',
    estado: 'VIGENTE (DEMO)',
  },
];

export const MOCK_VEHICLES = [
  {
    id: 'VEH-DEMO-001',
    patente: 'DEMO-001',
    marca: 'Marca DEMO',
    modelo: 'Modelo DEMO',
    anio: 'DEMO',
    capacidad: 4,
    estado: 'ACTIVO (DEMO)',
    conductor: 'Conductor DEMO 01',
    rutas: ['233003'],
  },
];

export const MOCK_ROUTES = rutasConatacoch.map((ruta) => ({
  id: `RUTA-${ruta.folio}`,
  folio: ruta.folio,
  nombre: '',
  origen: '',
  destino: '',
  descripcion: '',
  estado: 'SIN VERIFICAR',
  callesIda: [...(ruta.callesIda || [])],
  callesRegreso: [...(ruta.callesRegreso || [])],
  coordenadasIda: [],
  coordenadasRegreso: [],
  geometriaVerificada: false,
}));

export const MOCK_VEHICLE_ROUTES = [
  {
    id: 'REL-DEMO-001',
    vehiculo: 'VEH-DEMO-001',
    patente: 'DEMO-001',
    ruta: 'RUTA-233003',
    folio: '233003',
    activo: true,
  },
];

export const MOCK_REQUESTS = [
  {
    id: 'SOL-DEMO-001',
    pasajero: 'Usuario DEMO 01',
    vehiculo: 'VEH-DEMO-001',
    conductor: 'Conductor DEMO 01',
    ruta: '233003',
    asientos: 1,
    fecha: '2026-01-11 09:00',
    hora: '09:00',
    puntoRecogida: 'Punto de recogida DEMO',
    latitud: null,
    longitud: null,
    estado: 'PENDIENTE',
  },
  {
    id: 'SOL-DEMO-002',
    pasajero: 'Usuario temporal DEMO',
    vehiculo: 'Sin asignar DEMO',
    conductor: 'Sin asignar DEMO',
    ruta: 'No especificada',
    asientos: 2,
    fecha: '2026-01-11 09:15',
    hora: '09:15',
    puntoRecogida: 'Ubicación no disponible DEMO',
    latitud: null,
    longitud: null,
    estado: 'PENDIENTE',
  },
];

export const MOCK_TRIPS = [
  {
    id: 'VIAJE-DEMO-001',
    solicitud: 'SOL-DEMO-001',
    pasajero: 'Usuario DEMO 01',
    conductor: 'Conductor DEMO 01',
    vehiculo: 'VEH-DEMO-001',
    ruta: '233003',
    asientos: 1,
    inicio: '2026-01-10 10:00',
    fin: '2026-01-10 10:30',
    estado: 'FINALIZADO',
    calificacion: 5,
    horaInicio: '10:00',
    horaFin: '10:30',
  },
];

export const MOCK_RATINGS = [
  {
    id: 'CAL-DEMO-001',
    viaje: 'VIAJE-DEMO-001',
    usuario: 'Usuario DEMO 01',
    conductor: 'Conductor DEMO 01',
    puntaje: 5,
    comentario: 'Comentario de demostración.',
    fecha: '2026-01-10',
  },
];

export const MOCK_EMERGENCIES = [];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'NOTIF-DEMO-001',
    tipo: 'SISTEMA',
    titulo: 'Aviso de demostración',
    detalle: 'Esta notificación es MOCK; no corresponde a una alerta real.',
    fecha: '2026-01-11',
    estado: 'NO LEÍDA',
  },
];

export const MOCK_LOCATIONS = [];

export const MOCK_COLLECTIONS = {
  usuarios: MOCK_USERS,
  conductores: MOCK_DRIVERS,
  licencias: MOCK_LICENSES,
  vehiculos: MOCK_VEHICLES,
  rutas: MOCK_ROUTES,
  vehiculoRuta: MOCK_VEHICLE_ROUTES,
  solicitudes: MOCK_REQUESTS,
  viajes: MOCK_TRIPS,
  calificaciones: MOCK_RATINGS,
  emergencias: MOCK_EMERGENCIES,
  notificaciones: MOCK_NOTIFICATIONS,
  ubicaciones: MOCK_LOCATIONS,
};

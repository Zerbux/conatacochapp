import { rutasConatacoch } from '../pantallas/rutasConatacoch';

export const MOCK_USERS = [
  {
    id: 1,
    identificador: 'USR-DEMO-001',
    nombre_usuario: 'Usuario',
    apellido_usuario: 'DEMO 01',
    email: 'usuario-demo-01@example.test',
    telefono: 'No disponible DEMO',
    tipo_usuario: 'REGISTRADO',
    fechaCreacion: '2026-01-10',
    ultimaActividad: '2026-01-10',
    estado: 'ACTIVO',
    installation_id: null,
  },
  {
    id: 2,
    identificador: 'USR-TEMP-DEMO-002',
    nombre_usuario: 'Usuario temporal',
    apellido_usuario: 'DEMO',
    email: 'No disponible DEMO',
    telefono: 'No disponible DEMO',
    tipo_usuario: 'TEMPORAL',
    fechaCreacion: '2026-01-11',
    ultimaActividad: '2026-01-11',
    estado: 'ACTIVO',
    installation_id: 'INSTALLATION-DEMO-002',
  },
  {
    id: 3,
    identificador: 'ADMIN-DEMO-001',
    nombre_usuario: 'Administrador',
    apellido_usuario: 'DEMO',
    email: 'admin-demo@example.test',
    telefono: 'No disponible DEMO',
    tipo_usuario: 'ADMIN',
    fechaCreacion: '2026-01-01',
    ultimaActividad: '2026-01-11',
    estado: 'ACTIVO',
    installation_id: null,
  },
  {
    id: 4,
    identificador: 'USR-COND-DEMO-001',
    nombre_usuario: 'Conductor DEMO',
    apellido_usuario: '01',
    email: 'conductor-demo-01@example.test',
    telefono: 'No disponible DEMO',
    tipo_usuario: 'CONDUCTOR',
    fechaCreacion: '2026-01-01',
    ultimaActividad: '2026-01-11',
    estado: 'ACTIVO',
    installation_id: null,
  },
];

export const MOCK_DRIVERS = [
  {
    id: 1,
    rut: 'RUT DEMO 001',
    nombre_chofer: 'Conductor DEMO',
    apellido_chofer: '01',
    direccion: 'Dirección DEMO',
    comuna: 'Comuna DEMO',
    fono_celular: 'No disponible DEMO',
    fono_fijo: 'No disponible DEMO',
    fono_emergencia: 'No disponible DEMO',
    usuario_email: 'conductor-demo-01@example.test',
    estado: 'ACTIVO',
    biometria_activa: false,
    usuario: 4,
    licencia_id: 1,
    vehiculo_id: 1,
  },
];

export const MOCK_LICENSES = [
  {
    id: 1,
    conductor: 1,
    clase: 'A2',
    fecha_emision: '2024-01-01',
    comuna_emision: 'Comuna DEMO',
    fecha_vencimiento: '2027-01-01',
    estado: 'VIGENTE (DEMO)',
  },
];

export const MOCK_VEHICLES = [
  {
    id: 1,
    patente: 'DEMO-001',
    marca: 'Marca DEMO',
    modelo: 'Modelo DEMO',
    anio: 'DEMO',
    capacidad: 4,
    estado: 'ACTIVO (DEMO)',
    conductor: 1,
    rutas: ['233003'],
  },
];

export const MOCK_ROUTES = rutasConatacoch.map((ruta, index) => ({
  id: index + 1,
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
    id: 1,
    vehiculo: 1,
    patente: 'DEMO-001',
    ruta: MOCK_ROUTES.find((route) => String(route.folio) === '233003')?.id || 1,
    folio: '233003',
    activo: true,
  },
];

export const MOCK_REQUESTS = [
  {
    id: 1,
    usuario: 1,
    pasajero: 'Usuario DEMO 01',
    vehiculo: 1,
    conductor: 'Conductor DEMO 01',
    ruta: MOCK_ROUTES.find((route) => String(route.folio) === '233003')?.id || 1,
    asientos: 1,
    fecha: '2026-01-11 09:00',
    hora: '09:00',
    puntoRecogida: 'Punto de recogida DEMO',
    latitud: null,
    longitud: null,
    estado: 'PENDIENTE',
  },
  {
    id: 2,
    usuario: 2,
    pasajero: 'Usuario temporal DEMO',
    vehiculo: 1,
    conductor: 'Sin asignar DEMO',
    ruta: MOCK_ROUTES.find((route) => String(route.folio) === '233003')?.id || 1,
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
    id: 1,
    solicitud: 1,
    pasajero: 'Usuario DEMO 01',
    conductor: 'Conductor DEMO 01',
    vehiculo: 1,
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
    id: 1,
    viaje: 1,
    usuario: 1,
    conductor: 1,
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
    estado: 'NO_LEIDA',
  },
];

export const MOCK_LOCATIONS = [];
export const MOCK_ROUTE_TRACES = [];

export const MOCK_COLLECTIONS = {
  usuarios: MOCK_USERS,
  conductores: MOCK_DRIVERS,
  licencias: MOCK_LICENSES,
  vehiculos: MOCK_VEHICLES,
  rutas: MOCK_ROUTES,
  trazadosRuta: MOCK_ROUTE_TRACES,
  vehiculoRuta: MOCK_VEHICLE_ROUTES,
  solicitudes: MOCK_REQUESTS,
  viajes: MOCK_TRIPS,
  calificaciones: MOCK_RATINGS,
  emergencias: MOCK_EMERGENCIES,
  notificaciones: MOCK_NOTIFICATIONS,
  ubicaciones: MOCK_LOCATIONS,
};

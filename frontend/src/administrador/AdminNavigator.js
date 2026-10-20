import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import {
  COLORES,
  DataCard,
  DemoBanner,
  DangerButton,
  EmptyState,
  Field,
  Header,
  Page,
  PrimaryButton,
  Screen,
  SearchBar,
  SecondaryButton,
  StatCard,
  StatusBadge,
} from '../componentes/KitUI';
import { DEMO_MODE, loginWithRole, logout as logoutSession } from '../servicios/authService';
import { createRecord, listRecords, setRecordActive, updateRecord } from '../servicios/dataService';

const REGION_LA_GRANJA = {
  latitude: -33.5385,
  longitude: -70.6278,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const MODULES = {
  usuarios: {
    title: 'Usuarios',
    collection: 'usuarios',
    icon: 'people-outline',
    toggleStatus: true,
    searchable: ['id', 'identificador', 'nombre_usuario', 'apellido_usuario', 'email', 'telefono', 'tipo_usuario'],
    fields: [
      ['nombre_usuario', 'Nombre del pasajero'],
      ['apellido_usuario', 'Apellido del pasajero'],
      ['identificador', 'Identificador'],
      ['email', 'Correo', 'email-address'],
      ['password', 'Contraseña (mínimo 8 caracteres)'],
      ['telefono', 'Teléfono'],
      ['tipo_usuario', 'Tipo (TEMPORAL / REGISTRADO / CONDUCTOR / ADMIN)'],
      ['is_active', 'Activo (true / false)'],
    ],
  },
  conductores: {
    title: 'Conductores',
    collection: 'conductores',
    icon: 'person-circle-outline',
    toggleStatus: true,
    searchable: ['id', 'rut', 'nombre_chofer', 'apellido_chofer', 'usuario_email', 'comuna', 'estado'],
    fields: [
      ['usuario', 'ID numérico de usuario vinculado', 'numeric'],
      ['rut', 'RUT DEMO / Identificador'],
      ['nombre_chofer', 'Nombre del conductor'],
      ['apellido_chofer', 'Apellido del conductor'],
      ['direccion', 'Dirección'],
      ['comuna', 'Comuna'],
      ['fono_celular', 'Teléfono celular'],
      ['fono_fijo', 'Teléfono fijo'],
      ['fono_emergencia', 'Teléfono de emergencia'],
      ['estado', 'Estado'],
      ['biometria_activa', 'Biometría activa (true / false)'],
    ],
  },
  licencias: {
    title: 'Licencias',
    collection: 'licencias',
    icon: 'card-outline',
    searchable: ['id', 'conductor', 'clase', 'estado', 'comuna_emision'],
    filters: ['TODOS', 'A2', 'A3', 'VIGENTE', 'VENCIDA', 'SUSPENDIDA'],
    fields: [
      ['conductor', 'ID numérico del conductor', 'numeric'],
      ['clase', 'Clase A2 / A3'],
      ['fecha_emision', 'Fecha emisión (AAAA-MM-DD)'],
      ['comuna_emision', 'Comuna emisión'],
      ['fecha_vencimiento', 'Fecha vencimiento (AAAA-MM-DD)'],
      ['estado', 'Estado'],
    ],
  },
  vehiculos: {
    title: 'Vehículos',
    collection: 'vehiculos',
    icon: 'car-sport-outline',
    toggleStatus: true,
    searchable: ['id', 'patente', 'marca', 'modelo', 'conductor', 'estado'],
    fields: [
      ['patente', 'Patente DEMO'],
      ['marca', 'Marca'],
      ['modelo', 'Modelo'],
      ['anio', 'Año'],
      ['capacidad', 'Capacidad (1 a 4)'],
      ['asientos_disponibles', 'Asientos disponibles'],
      ['maletero_ocupado', 'Maletero ocupado (true / false)'],
      ['en_servicio', 'En servicio (true / false)'],
      ['conductor', 'ID numérico del conductor (opcional)', 'numeric'],
      ['estado', 'Estado'],
    ],
  },
  rutas: {
    title: 'Rutas',
    collection: 'rutas',
    icon: 'map-outline',
    toggleStatus: true,
    searchable: ['folio', 'nombre', 'origen', 'destino', 'estado'],
    fields: [
      ['folio', 'Folio'],
      ['nombre', 'Nombre registrado'],
      ['origen', 'Origen'],
      ['destino', 'Destino'],
      ['descripcion', 'Descripción', 'default', true],
      ['estado', 'Estado'],
    ],
  },
  trazadosRuta: {
    title: 'Trazados de ruta',
    collection: 'trazadosRuta',
    icon: 'git-branch-outline',
    searchable: ['id', 'ruta', 'sentido', 'orden', 'calle'],
    fields: [
      ['ruta', 'Ruta', 'numeric'],
      ['sentido', 'Sentido (IDA / REGRESO)'],
      ['orden', 'Orden del punto', 'numeric'],
      ['calle', 'Calle'],
      ['latitud', 'Latitud GPS', 'numeric'],
      ['longitud', 'Longitud GPS', 'numeric'],
    ],
  },
  vehiculoRuta: {
    title: 'Vehículo ↔ Ruta',
    collection: 'vehiculoRuta',
    icon: 'git-compare-outline',
    toggleStatus: true,
    searchable: ['id', 'vehiculo', 'patente', 'ruta', 'folio'],
    fields: [
      ['vehiculo', 'ID numérico del vehículo', 'numeric'],
      ['ruta', 'ID numérico de la ruta', 'numeric'],
      ['activo', 'Activo (true / false)'],
    ],
  },
  solicitudes: {
    title: 'Solicitudes',
    collection: 'solicitudes',
    icon: 'clipboard-outline',
    searchable: ['id', 'pasajero', 'vehiculo', 'conductor', 'ruta', 'estado'],
    filters: ['TODOS', 'PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'],
    fields: [
      ['usuario', 'ID numérico del pasajero', 'numeric'],
      ['vehiculo', 'ID numérico del vehículo', 'numeric'],
      ['ruta', 'ID numérico de la ruta', 'numeric'],
      ['asientos', 'Cantidad de asientos'],
      ['latitud_recogida', 'Latitud de recogida', 'numeric'],
      ['longitud_recogida', 'Longitud de recogida', 'numeric'],
      ['estado', 'Estado'],
    ],
  },
  viajes: {
    title: 'Viajes',
    collection: 'viajes',
    icon: 'navigate-outline',
    searchable: ['id', 'solicitud', 'pasajero', 'conductor', 'vehiculo', 'ruta', 'estado'],
    filters: ['TODOS', 'PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'],
    fields: [
      ['solicitud', 'ID numérico de solicitud', 'numeric'],
      ['estado', 'Estado'],
    ],
  },
  ubicaciones: {
    title: 'Monitoreo GPS',
    collection: 'ubicaciones',
    icon: 'location-outline',
    searchable: ['id', 'vehiculo', 'fecha_hora', 'activo'],
    readOnly: true,
    map: true,
  },
  calificaciones: {
    title: 'Calificaciones',
    collection: 'calificaciones',
    icon: 'star-outline',
    searchable: ['id', 'viaje', 'usuario', 'conductor', 'puntaje', 'fecha'],
    filters: ['TODOS', '1', '2', '3', '4', '5'],
    readOnly: true,
  },
  emergencias: {
    title: 'Emergencias',
    collection: 'emergencias',
    icon: 'alert-circle-outline',
    toggleStatus: false,
    searchable: ['id', 'conductor', 'vehiculo', 'fecha', 'estado'],
    filters: ['TODOS', 'ACTIVA', 'ATENDIDA', 'CERRADA'],
    fields: [
      ['conductor', 'ID numérico del conductor', 'numeric'],
      ['vehiculo', 'ID numérico del vehículo', 'numeric'],
      ['latitud', 'Latitud', 'numeric'],
      ['longitud', 'Longitud', 'numeric'],
      ['observacion', 'Observación', 'default', true],
      ['estado', 'Estado (ACTIVA / ATENDIDA / CERRADA)'],
    ],
  },
  notificaciones: {
    title: 'Notificaciones',
    collection: 'notificaciones',
    icon: 'notifications-outline',
    searchable: ['id', 'tipo', 'titulo', 'detalle', 'estado'],
    filters: ['TODOS', 'NO_LEIDA', 'LEIDA'],
    readOnly: true,
  },
};

const CATEGORY_MODULES = {
  dashboard: ['usuarios', 'conductores', 'vehiculos', 'rutas', 'trazadosRuta', 'solicitudes', 'viajes', 'ubicaciones', 'calificaciones', 'emergencias'],
  personas: ['usuarios', 'conductores', 'licencias', 'calificaciones'],
  flota: ['vehiculos', 'rutas', 'trazadosRuta', 'vehiculoRuta'],
  operacion: ['solicitudes', 'viajes', 'ubicaciones'],
  control: ['emergencias', 'notificaciones'],
  sistema: ['reportes', 'perfil', 'configuracion'],
};

const RELATION_FIELDS = {
  conductores: { usuario: 'usuarios' },
  licencias: { conductor: 'conductores' },
  vehiculos: { conductor: 'conductores' },
  vehiculoRuta: { vehiculo: 'vehiculos', ruta: 'rutas' },
  trazadosRuta: { ruta: 'rutas' },
  solicitudes: { usuario: 'usuarios', vehiculo: 'vehiculos', ruta: 'rutas' },
  viajes: { solicitud: 'solicitudes' },
  emergencias: { conductor: 'conductores', vehiculo: 'vehiculos' },
};

function getRelationLabel(collection, item) {
  if (collection === 'usuarios') {
    return `${[item.nombre_usuario, item.apellido_usuario].filter(Boolean).join(' ') || item.email || item.identificador} · ID ${item.id}`;
  }
  if (collection === 'conductores') {
    return `${[item.nombre_chofer, item.apellido_chofer].filter(Boolean).join(' ') || item.rut} · ID ${item.id}`;
  }
  if (collection === 'vehiculos') return `${item.patente} · ID ${item.id}`;
  if (collection === 'rutas') return `${item.folio} · ${item.nombre} · ID ${item.id}`;
  if (collection === 'solicitudes') return `Solicitud ${item.id} · ${item.estado}`;
  return `ID ${item.id}`;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', group: 'OPERACIÓN' },
  { id: 'personas', label: 'Personas', icon: 'people-outline', group: 'PERSONAS' },
  { id: 'flota', label: 'Flota', icon: 'car-outline', group: 'FLOTA' },
  { id: 'operacion', label: 'Operación', icon: 'navigate-outline', group: 'OPERACIÓN' },
  { id: 'control', label: 'Control', icon: 'shield-checkmark-outline', group: 'CONTROL' },
  { id: 'sistema', label: 'Sistema', icon: 'settings-outline', group: 'SISTEMA' },
];

function isRecordActive(record) {
  if (typeof record.is_active === 'boolean') return record.is_active;
  if (typeof record.activo === 'boolean') return record.activo;
  const state = String(record.estado || '').toUpperCase();
  return state.startsWith('ACTIVO') || state.startsWith('ACTIVA');
}

function AdminLoginScreen({ onSuccess, onBack }) {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!credential.trim() || !password) {
      setError('Ingresa tu usuario o correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const admin = await loginWithRole('ADMIN', credential, password);
      onSuccess(admin);
    } catch (loginError) {
      setError(loginError.message || 'No fue posible validar el acceso administrativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Acceso administrativo" subtitle="Solo personal autorizado" onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.loginBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.loginForm} keyboardShouldPersistTaps="handled">
          {DEMO_MODE ? (
            <DemoBanner>ACCESO DEMO: admin-demo · ADMIN-ONLY. No usar cuentas reales.</DemoBanner>
          ) : null}
          <Field
            label="Correo o usuario"
            value={credential}
            onChangeText={setCredential}
            placeholder="Cuenta administrativa"
            keyboardType="email-address"
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.showPassword} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={COLORES.gris} />
            <Text style={styles.secondaryText}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
          </TouchableOpacity>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <PrimaryButton title={loading ? 'Validando...' : 'Ingresar'} icon="log-in-outline" disabled={loading} onPress={submit} />
          <Text style={styles.securityNotice}>
            {DEMO_MODE
              ? 'Acceso de demostración. No se conecta ni modifica la base de datos.'
              : 'El servidor valida la cuenta y limita cada operación según el rol.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AdminDashboardScreen({ onOpen }) {
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all(Object.entries({
      usuarios: 'usuarios',
      conductores: 'conductores',
      vehiculos: 'vehiculos',
      rutas: 'rutas',
      solicitudes: 'solicitudes',
      viajes: 'viajes',
      emergencias: 'emergencias',
      calificaciones: 'calificaciones',
    }).map(async ([key, collection]) => [key, await listRecords(collection)]))
      .then((entries) => {
        const collections = Object.fromEntries(entries);
        return [
          ['usuarios', collections.usuarios.length],
          ['usuariosTemporales', collections.usuarios.filter((item) => item.tipo === 'TEMPORAL' || item.tipo_usuario === 'TEMPORAL').length],
          ['conductores', collections.conductores.length],
          ['vehiculos', collections.vehiculos.length],
          ['rutas', collections.rutas.length],
          ['solicitudesPendientes', collections.solicitudes.filter((item) => item.estado === 'PENDIENTE').length],
          ['viajesActivos', collections.viajes.filter((item) => item.estado === 'EN_CURSO').length],
          ['emergencias', collections.emergencias.length],
          ['calificaciones', collections.calificaciones.length],
        ];
      })
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch((loadError) => setError(loadError.message));
  }, []);

  if (error) {
    return <Page title="Dashboard"><Text accessibilityRole="alert" style={styles.error}>{error}</Text></Page>;
  }

  const cards = [
    ['Usuarios', counts.usuarios, 'people-outline', 'usuarios'],
    ['Usuarios temporales', counts.usuariosTemporales, 'person-outline', 'usuarios'],
    ['Conductores', counts.conductores, 'person-circle-outline', 'conductores'],
    ['Vehículos', counts.vehiculos, 'car-sport-outline', 'vehiculos'],
    ['Rutas', counts.rutas, 'map-outline', 'rutas'],
    ['Solicitudes pendientes', counts.solicitudesPendientes, 'clipboard-outline', 'solicitudes'],
    ['Viajes activos', counts.viajesActivos, 'navigate-outline', 'viajes'],
    ['Emergencias registradas', counts.emergencias, 'alert-circle-outline', 'emergencias'],
    ['Calificaciones', counts.calificaciones, 'star-outline', 'calificaciones'],
  ];

  return (
    <Page title="Dashboard" subtitle="Resumen de la consola administrativa">
      <DemoBanner>{DEMO_MODE ? 'Indicadores MOCK; no representan operaciones reales.' : 'Indicadores consultados al servidor.'}</DemoBanner>
      <View style={styles.statsGrid}>
        {cards.map(([label, value, icon, screen]) => (
          <StatCard
            key={label}
            label={label}
            value={value ?? '...'}
            icon={icon}
            onPress={() => onOpen(screen)}
          />
        ))}
      </View>
      <DataCard>
        <Text style={styles.sectionTitle}>Estado del sistema</Text>
        <Text style={styles.bodyText}>Backend: {DEMO_MODE ? 'sin conexión (modo DEMO)' : 'API autenticada'}</Text>
        <Text style={styles.bodyText}>Autorización: {DEMO_MODE ? 'simulada' : 'token y permisos por rol'}</Text>
        <Text style={styles.bodyText}>Monitoreo GPS: posiciones recientes del servidor.</Text>
      </DataCard>
      <Text style={styles.sectionTitle}>Acceso a módulos</Text>
      <View style={styles.moduleGrid}>
        {Object.entries(MODULES).map(([id, module]) => (
          <TouchableOpacity key={id} style={styles.moduleTile} onPress={() => onOpen(id)}>
            <Ionicons name={module.icon} size={22} color={COLORES.verde} />
            <Text style={styles.moduleTitle}>{module.title}</Text>
          </TouchableOpacity>
        ))}
        {['reportes', 'perfil', 'configuracion'].map((id) => (
          <TouchableOpacity key={id} style={styles.moduleTile} onPress={() => onOpen(id)}>
            <Ionicons name={id === 'reportes' ? 'bar-chart-outline' : id === 'perfil' ? 'person-outline' : 'settings-outline'} size={22} color={COLORES.verde} />
            <Text style={styles.moduleTitle}>{id === 'reportes' ? 'Reportes' : id === 'perfil' ? 'Perfil' : 'Configuración'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Page>
  );
}

function CategoryScreen({ category, onOpen }) {
  const moduleIds = CATEGORY_MODULES[category] || [];
  const title = MENU_ITEMS.find((item) => item.id === category)?.label || 'Sección';
  return (
    <Page title={title} subtitle="Selecciona un módulo">
      <DemoBanner>{DEMO_MODE ? 'Consola administrativa DEMO.' : 'Módulos conectados a los registros del servidor.'}</DemoBanner>
      {moduleIds.length ? (
        <View style={styles.moduleGrid}>
          {moduleIds.map((id) => {
            const module = MODULES[id];
            if (!module) {
              const titles = { reportes: 'Reportes', perfil: 'Perfil', configuracion: 'Configuración' };
              return (
                <TouchableOpacity key={id} style={styles.moduleTile} onPress={() => onOpen(id)}>
                  <Ionicons name={id === 'reportes' ? 'bar-chart-outline' : id === 'perfil' ? 'person-outline' : 'settings-outline'} size={22} color={COLORES.verde} />
                  <Text style={styles.moduleTitle}>{titles[id]}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={id} style={styles.moduleTile} onPress={() => onOpen(id)}>
                <Ionicons name={module.icon} size={22} color={COLORES.verde} />
                <Text style={styles.moduleTitle}>{module.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="Sección no disponible"
          description="Vuelve al menú principal y selecciona una sección habilitada."
          icon="construct-outline"
        />
      )}
    </Page>
  );
}

function RecordForm({ visible, module, record, onCancel, onSave }) {
  const initialValues = useMemo(() => {
    if (!module) return {};
    if (record) return { ...record };
    return Object.fromEntries((module.fields || []).map(([key]) => [key, '']));
  }, [module, record]);
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [referenceOptions, setReferenceOptions] = useState({});
  const [openReference, setOpenReference] = useState(null);

  useEffect(() => {
    setValues(initialValues);
    setError('');
    setOpenReference(null);
  }, [initialValues, visible]);

  useEffect(() => {
    if (!visible || !module) return undefined;
    const collections = [...new Set(Object.values(RELATION_FIELDS[module.collection] || {}))];
    if (!collections.length) {
      setReferenceOptions({});
      return undefined;
    }
    let mounted = true;
    Promise.all(collections.map(async (collection) => [collection, await listRecords(collection)]))
      .then((entries) => {
        if (mounted) setReferenceOptions(Object.fromEntries(entries));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'No se pudieron cargar las opciones relacionadas.');
      });
    return () => { mounted = false; };
  }, [visible, module]);

  if (!module) return null;

  const save = async () => {
    const optionalFields = new Set(['estado', 'telefono', 'fono_fijo', 'fono_emergencia', 'descripcion', 'biometria_activa', 'activo', 'is_active', 'conductor', 'password']);
    const required = (module.fields || []).filter(([key]) =>
      !optionalFields.has(key) && !(record && key === 'password'));
    if (required.some(([key]) => values[key] == null || String(values[key]).trim() === '')) {
      setError('Completa los campos requeridos antes de guardar.');
      return;
    }
    if (module.collection === 'emergencias' && !values.conductor) {
      setError('Selecciona el conductor asociado a la emergencia.');
      return;
    }
    if (module.collection === 'vehiculos' && !record) {
      const capacity = Number(values.capacidad);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 4) {
        setError('La capacidad debe ser un número entre 1 y 4.');
        return;
      }
      if (!Number.isInteger(Number(values.asientos_disponibles)) || Number(values.asientos_disponibles) < 0 || Number(values.asientos_disponibles) > capacity) {
        setError('Los asientos disponibles deben estar entre 0 y la capacidad total del vehículo.');
        return;
      }
    }
    if (module.collection === 'usuarios' && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (module.collection === 'usuarios' && !['TEMPORAL', 'REGISTRADO', 'CONDUCTOR', 'ADMIN'].includes(String(values.tipo_usuario).toUpperCase())) {
      setError('El tipo debe ser TEMPORAL, REGISTRADO, CONDUCTOR o ADMIN.');
      return;
    }
    if (module.collection === 'conductores' && !DEMO_MODE && !/^\d+$/.test(String(values.usuario))) {
      setError('Ingresa el ID numérico de un usuario existente.');
      return;
    }
    if (module.collection === 'usuarios' && !record && String(values.password || '').length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres.');
      return;
    }
    if (module.collection === 'licencias') {
      if (!['A2', 'A3'].includes(String(values.clase).toUpperCase())) {
        setError('La clase de licencia debe ser A2 o A3.');
        return;
      }
      if (!/^\d+$/.test(String(values.conductor))) {
        setError('Selecciona el ID numérico de un conductor existente.');
        return;
      }
      const validDate = (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
        const [year, month, day] = value.split('-').map(Number);
        const parsed = new Date(Date.UTC(year, month - 1, day));
        return parsed.getUTCFullYear() === year &&
          parsed.getUTCMonth() === month - 1 &&
          parsed.getUTCDate() === day;
      };
      if (!validDate(values.fecha_emision) || !validDate(values.fecha_vencimiento)) {
        setError('Las fechas deben usar el formato AAAA-MM-DD.');
        return;
      }
    }
    if (module.collection === 'solicitudes') {
      const seats = Number(values.asientos);
      if (!Number.isInteger(seats) || seats < 1 || seats > 4) {
        setError('La cantidad de pasajeros debe estar entre 1 y 4.');
        return;
      }
      if (!['usuario', 'vehiculo', 'ruta', 'latitud_recogida', 'longitud_recogida'].every((key) => Number.isFinite(Number(values[key])))) {
        setError('Pasajero, vehículo, ruta y coordenadas deben ser valores numéricos válidos.');
        return;
      }
    }
    if (module.collection === 'trazadosRuta') {
      const latitude = Number(values.latitud);
      const longitude = Number(values.longitud);
      if (!['IDA', 'REGRESO'].includes(String(values.sentido).toUpperCase())) {
        setError('El sentido debe ser IDA o REGRESO.');
        return;
      }
      if ((!DEMO_MODE && !Number.isInteger(Number(values.ruta))) ||
          !Number.isInteger(Number(values.orden)) || Number(values.orden) < 1) {
        setError('Selecciona una ruta e indica un orden entero mayor que cero.');
        return;
      }
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setError('Ingresa coordenadas GPS válidas.');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...values };
      if (module.collection === 'vehiculos') {
        for (const key of ['capacidad', 'asientos_disponibles', 'anio']) {
          if (payload[key] === '' && record) delete payload[key];
          else if (payload[key] != null && payload[key] !== '') payload[key] = Number(payload[key]);
        }
        for (const key of ['maletero_ocupado', 'en_servicio']) {
          if (payload[key] === '') delete payload[key];
          else payload[key] = String(payload[key]).toLowerCase() === 'true';
        }
        if (payload.conductor) payload.conductor = Number(payload.conductor);
        else delete payload.conductor;
      }
      if (module.collection === 'conductores') payload.biometria_activa = String(payload.biometria_activa).toLowerCase() === 'true';
      if (module.collection === 'conductores') payload.usuario = Number(payload.usuario);
      if (module.collection === 'licencias') payload.conductor = Number(payload.conductor);
      if (module.collection === 'vehiculoRuta') {
        payload.vehiculo = Number(payload.vehiculo);
        payload.ruta = Number(payload.ruta);
        payload.activo = String(payload.activo).toLowerCase() !== 'false';
      }
      if (module.collection === 'solicitudes') {
        payload.usuario = Number(payload.usuario);
        payload.vehiculo = Number(payload.vehiculo);
        payload.ruta = Number(payload.ruta);
        payload.asientos = Number(payload.asientos);
        payload.latitud_recogida = Number(payload.latitud_recogida);
        payload.longitud_recogida = Number(payload.longitud_recogida);
      }
      if (module.collection === 'viajes' && payload.solicitud) payload.solicitud = Number(payload.solicitud);
      if (module.collection === 'trazadosRuta') {
        payload.ruta = Number(payload.ruta);
        payload.sentido = String(payload.sentido).toUpperCase();
        payload.orden = Number(payload.orden);
        payload.latitud = Number(payload.latitud);
        payload.longitud = Number(payload.longitud);
      }
      if (module.collection === 'emergencias') {
        for (const key of ['conductor', 'vehiculo']) {
          if (payload[key]) payload[key] = Number(payload[key]);
          else delete payload[key];
        }
        for (const key of ['latitud', 'longitud']) {
          if (payload[key] === '') delete payload[key];
          else if (payload[key] != null) payload[key] = Number(payload[key]);
        }
      }
      if (module.collection === 'usuarios') {
        if (payload.is_active === '') delete payload.is_active;
        else payload.is_active = String(payload.is_active).toLowerCase() === 'true';
        if (!payload.password) delete payload.password;
      }
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.formCard}>
          <View style={styles.modalHeading}>
            <Text style={styles.modalTitle}>{record ? `Editar ${module.title}` : `Crear ${module.title}`}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCancel}>
              <Ionicons name="close" size={25} color="#333333" />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <DemoBanner>{DEMO_MODE ? 'Los cambios se guardan solo en memoria MOCK.' : 'Los cambios se envían al servidor.'}</DemoBanner>
            {(module.fields || []).map(([key, label, keyboardType, multiline]) => {
              const collection = RELATION_FIELDS[module.collection]?.[key];
              const options = collection ? referenceOptions[collection] || [] : [];
              if (!collection) {
                return (
                  <Field
                    key={key}
                    label={label}
                    value={values[key]}
                    onChangeText={(text) => setValues((current) => ({ ...current, [key]: text }))}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    secureTextEntry={key === 'password'}
                  />
                );
              }
              const selected = options.find((item) => String(item.id) === String(values[key]));
              return (
                <View key={key} style={styles.referenceField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar ${label}`}
                    style={styles.referenceButton}
                    onPress={() => setOpenReference(openReference === key ? null : key)}
                  >
                    <Text style={styles.referenceValue}>
                      {selected ? getRelationLabel(collection, selected) : 'Seleccionar registro'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={COLORES.gris} />
                  </TouchableOpacity>
                  {openReference === key ? (
                    <View style={styles.referenceOptions}>
                      {key === 'conductor' && module.collection === 'vehiculos' ? (
                        <TouchableOpacity
                          style={styles.referenceOption}
                          onPress={() => {
                            setValues((current) => ({ ...current, [key]: '' }));
                            setOpenReference(null);
                          }}
                        >
                          <Text style={styles.referenceValue}>Sin conductor asignado</Text>
                        </TouchableOpacity>
                      ) : null}
                      <ScrollView nestedScrollEnabled style={styles.referenceOptionList}>
                        {options.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.referenceOption}
                            onPress={() => {
                              setValues((current) => ({ ...current, [key]: String(item.id) }));
                              setOpenReference(null);
                            }}
                          >
                            <Text style={styles.referenceValue}>{getRelationLabel(collection, item)}</Text>
                          </TouchableOpacity>
                        ))}
                        {!options.length ? <Text style={styles.secondaryText}>No hay registros disponibles.</Text> : null}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <PrimaryButton title={saving ? 'Guardando...' : 'Guardar'} disabled={saving} onPress={save} />
            <SecondaryButton title="Cancelar" onPress={onCancel} style={styles.formCancel} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RecordCard({ item, module, onOpen, onEdit, onToggle, onAction }) {
  const driverName = [item.nombre_chofer, item.apellido_chofer].filter(Boolean).join(' ');
  const userName = [item.nombre_usuario, item.apellido_usuario].filter(Boolean).join(' ');
  const title = module.collection === 'conductores'
    ? driverName || item.nombre || item.rut || item.id
    : module.collection === 'usuarios'
      ? userName || item.nombre || item.identificador || item.id
      : item.nombre || item.titulo || item.folio || item.patente || item.rut || item.id;
  const secondary = item.usuario_email || item.email || item.correo || item.estado || item.tipo_usuario || item.tipo || item.ruta || item.comuna || '';
  const status = item.estado ||
    (typeof item.activo === 'boolean' ? (item.activo ? 'ACTIVO' : 'INACTIVO') : null) ||
    (typeof item.is_active === 'boolean' ? (item.is_active ? 'ACTIVO' : 'INACTIVO') : null);
  const active = isRecordActive(item);
  return (
    <DataCard>
      <TouchableOpacity activeOpacity={0.75} onPress={() => onOpen(item)}>
        <View style={styles.recordTop}>
          <View style={styles.recordIcon}>
            <Ionicons name={module.icon} size={20} color={COLORES.verde} />
          </View>
          <View style={styles.recordText}>
            <Text style={styles.recordTitle}>{String(title)}</Text>
            {secondary ? <Text style={styles.secondaryText}>{String(secondary)}</Text> : null}
          </View>
          {status ? <StatusBadge label={String(status)} tone={String(status).includes('ACTIV') || status === 'VIGENTE' ? 'success' : 'neutral'} /> : null}
        </View>
      </TouchableOpacity>
      <View style={styles.recordActions}>
        <SecondaryButton title="Ver detalle" icon="eye-outline" onPress={() => onOpen(item)} style={styles.smallButton} />
        {module.collection === 'emergencias' && item.estado === 'ACTIVA' ? (
          <SecondaryButton title="Atender" icon="checkmark-circle-outline" onPress={() => onAction(item, 'ATENDIDA')} style={styles.smallButton} />
        ) : null}
        {module.collection === 'emergencias' && item.estado === 'ATENDIDA' ? (
          <SecondaryButton title="Cerrar emergencia" icon="close-circle-outline" onPress={() => onAction(item, 'CERRADA')} style={styles.smallButton} />
        ) : null}
        {module.collection === 'notificaciones' && item.estado !== 'LEIDA' ? (
          <SecondaryButton title="Marcar como leída" icon="checkmark-done-outline" onPress={() => onAction(item, 'LEIDA')} style={styles.smallButton} />
        ) : null}
        {!module.readOnly ? (
          <>
            <SecondaryButton title="Editar" icon="create-outline" onPress={() => onEdit(item)} style={styles.smallButton} />
            {module.toggleStatus ? (
              <SecondaryButton
                title={active ? 'Desactivar' : 'Activar'}
                icon={active ? 'remove-circle-outline' : 'checkmark-circle-outline'}
                onPress={() => onToggle(item)}
                style={styles.smallButton}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </DataCard>
  );
}

function AdminModuleScreen({ moduleId, onBack, onDetail, onOpenRouteMap, relatedFilter, onClearFilter }) {
  const module = MODULES[moduleId];
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRecords(await listRecords(module.collection));
    } catch (loadError) {
      setError(loadError.message || 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [module.collection]);

  const visible = useMemo(() => records.filter((record) => {
    if (relatedFilter && String(record[relatedFilter.field]) !== String(relatedFilter.value)) return false;
    const query = search.trim().toLowerCase();
    const matchText = !query || module.searchable.some((key) => String(record[key] ?? '').toLowerCase().includes(query));
    if (!matchText) return false;
    if (filter === 'TODOS') return true;
    if (moduleId === 'licencias') return String(record.clase).toUpperCase() === filter || String(record.estado).toUpperCase().includes(filter);
    if (moduleId === 'calificaciones') return String(record.puntaje) === filter;
    return String(record.estado || '').toUpperCase() === filter;
  }), [records, search, filter, module, moduleId, relatedFilter]);

  const saveRecord = async (payload) => {
    if (editing) await updateRecord(module.collection, editing.id, payload);
    else await createRecord(module.collection, payload);
    setFormVisible(false);
    setEditing(null);
    await load();
    Alert.alert('Guardado', 'El registro se guardó correctamente.');
  };

  const toggleRecord = async () => {
    if (!pendingToggle) return;
    try {
      const isActive = isRecordActive(pendingToggle);
      await setRecordActive(module.collection, pendingToggle.id, !isActive);
      setPendingToggle(null);
      await load();
    } catch (toggleError) {
      setError(toggleError.message || 'No se pudo cambiar el estado.');
      setPendingToggle(null);
    }
  };

  const updateStatus = async (record, status) => {
    try {
      await updateRecord(module.collection, record.id, { estado: status });
      await load();
      Alert.alert('Actualizado', moduleId === 'notificaciones' ? 'La notificación quedó marcada como leída.' : 'El estado de la emergencia fue actualizado.');
    } catch (updateError) {
      setError(updateError.message || 'No se pudo actualizar el estado.');
    }
  };

  const renderRecord = ({ item }) => (
    <RecordCard
      item={item}
      module={module}
      onOpen={onDetail}
      onEdit={(record) => { setEditing(record); setFormVisible(true); }}
      onToggle={setPendingToggle}
      onAction={updateStatus}
    />
  );

  if (module.map) {
    const now = Date.now();
    const scopedRecords = relatedFilter
      ? records.filter((item) => String(item[relatedFilter.field]) === String(relatedFilter.value))
      : records;
    const locations = scopedRecords.filter((item) => {
      const latitude = Number(item.latitud);
      const longitude = Number(item.longitud);
      const recordedAt = new Date(item.fecha_hora).getTime();
      return Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180 &&
        item.activo !== false &&
        Number.isFinite(recordedAt) &&
        now - recordedAt >= 0 &&
        now - recordedAt <= 5 * 60 * 1000;
    });
    return (
      <Screen>
        <Header title={module.title} subtitle="Solo muestra posiciones recibidas hace menos de 5 minutos" onBack={onBack} />
        <View style={styles.mapBody}>
          <View style={styles.mapNotice}>
            {relatedFilter ? (
              <SecondaryButton title="Quitar filtro de relación" icon="close-circle-outline" onPress={onClearFilter} />
            ) : null}
            <DemoBanner>
              {DEMO_MODE
                ? 'No hay posiciones GPS reales. No se mostrarán vehículos DEMO como si estuvieran en línea.'
                : 'Solo se consideran actuales las posiciones válidas recibidas en los últimos 5 minutos.'}
            </DemoBanner>
          </View>
          <MapView provider={PROVIDER_DEFAULT} style={styles.monitorMap} initialRegion={REGION_LA_GRANJA}>
            {locations.map((item) => (
              <Marker
                key={item.id}
                coordinate={{ latitude: Number(item.latitud), longitude: Number(item.longitud) }}
                title={`Vehículo ${item.vehiculo}`}
                description={`GPS actualizado · ${new Date(item.fecha_hora).toLocaleTimeString()}`}
              />
            ))}
          </MapView>
          {locations.length === 0 && !loading && !error ? (
            <View style={styles.mapEmpty}>
              <EmptyState title="Sin ubicaciones actuales" description="No existe información reciente del servidor. Una ubicación antigua no se considera tiempo real." icon="location-outline" />
            </View>
          ) : null}
          {error ? <View style={styles.mapError}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View> : null}
          {loading ? <View style={styles.mapLoading}><Text style={styles.secondaryText}>Cargando ubicaciones...</Text></View> : null}
          <View style={styles.mapRecordList}>
            <Text style={styles.sectionTitle}>Historial de ubicaciones</Text>
            {scopedRecords.length ? scopedRecords.map((item) => (
              <DataCard key={item.id} onPress={() => onDetail(item)}>
                <Text style={styles.secondaryText}>{`Vehículo ${item.vehiculo || 'no especificado'} · ${item.fecha_hora || 'fecha no disponible'} · ${item.latitud ?? '—'}, ${item.longitud ?? '—'}`}</Text>
                <StatusBadge label={locations.includes(item) ? 'GPS ACTUALIZADO' : 'GPS DESACTUALIZADO'} tone={locations.includes(item) ? 'success' : 'neutral'} />
              </DataCard>
            )) : <Text style={styles.secondaryText}>No hay registros GPS disponibles para esta selección.</Text>}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={module.title} subtitle={DEMO_MODE ? 'Registros DEMO' : 'Registros del servidor'} onBack={onBack} />
      <FlatList
        style={styles.moduleListSurface}
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        contentContainerStyle={styles.moduleList}
        ListHeaderComponent={(
          <View>
            <DemoBanner>{DEMO_MODE ? 'Datos MOCK; los cambios no se envían al servidor.' : 'Datos recibidos del servidor.'}</DemoBanner>
            {relatedFilter ? (
              <SecondaryButton
                title="Quitar filtro de relación"
                icon="close-circle-outline"
                onPress={onClearFilter}
                style={styles.createButton}
              />
            ) : null}
            <SearchBar value={search} onChangeText={setSearch} placeholder={`Buscar ${module.title.toLowerCase()}...`} />
            {module.filters ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {module.filters.map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setFilter(value)}
                    style={[styles.filterChip, filter === value && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            {!module.readOnly ? (
              <PrimaryButton
                title={`Crear ${module.title.toLowerCase()}`}
                icon="add-circle-outline"
                onPress={() => { setEditing(null); setFormVisible(true); }}
                style={styles.createButton}
              />
            ) : null}
            {moduleId === 'rutas' ? (
              <Text style={styles.secondaryText}>Los datos de ruta se administran en el servidor; los puntos GPS se gestionan desde el detalle de cada ruta.</Text>
            ) : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {loading ? <Text style={styles.loadingText}>Cargando...</Text> : null}
          </View>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No hay registros para mostrar" description={relatedFilter ? 'No hay elementos asociados al registro seleccionado.' : search ? 'Prueba con otro término o filtro.' : 'No hay información disponible.'} /> : null}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <RecordForm
        visible={formVisible}
        module={module}
        record={editing}
        onCancel={() => { setFormVisible(false); setEditing(null); }}
        onSave={saveRecord}
      />
      <ConfirmModal
        visible={Boolean(pendingToggle)}
        title="Confirmar cambio de estado"
        message={DEMO_MODE
          ? 'Se conservará el registro y se cambiará entre ACTIVO e INACTIVO en el conjunto DEMO.'
          : 'Se conservará el registro y se actualizará su estado en el servidor.'}
        confirmLabel="Cambiar estado"
        onCancel={() => setPendingToggle(null)}
        onConfirm={toggleRecord}
      />
    </Screen>
  );
}

function AdminRecordDetail({ moduleId, record, onBack, onOpen, onOpenRelated, onOpenRouteMap }) {
  const module = MODULES[moduleId];
  if (!module || !record) {
    return <Page title="Detalle" onBack={onBack}><EmptyState title="Registro no disponible" /></Page>;
  }

  const renderValue = (label, value) => (
    <View key={label} style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value == null || value === '' ? 'No disponible' : String(value)}</Text>
    </View>
  );
  const entries = Object.entries(record).filter(([key]) => !['coordenadasIda', 'coordenadasRegreso', 'geometriaVerificada', 'trazados'].includes(key));

  return (
    <Page title={`Detalle · ${module.title}`} subtitle={String(record.id || '')} onBack={onBack}>
      <DemoBanner>{DEMO_MODE ? 'Detalle MOCK. Nunca se muestra una contraseña.' : 'No se muestran contraseñas.'}</DemoBanner>
      <DataCard>
        {entries.map(([key, value]) => renderValue(key, Array.isArray(value) ? value.join(', ') : value))}
      </DataCard>
      {moduleId === 'usuarios' && (record.tipo === 'TEMPORAL' || record.tipo_usuario === 'TEMPORAL') ? (
        <DataCard>
          <Text style={styles.sectionTitle}>Usuario temporal</Text>
          {renderValue('installation_id', record.installation_id)}
          {renderValue('Última actividad', record.ultimaActividad)}
          {renderValue('Estado', record.estado)}
        </DataCard>
      ) : null}
      {moduleId === 'usuarios' && record.tipo_usuario === 'CONDUCTOR' ? (
        <SecondaryButton title="Abrir perfil de conductor" icon="person-circle-outline" onPress={() => onOpenRelated('conductores', 'usuario', record.id)} />
      ) : null}
      {moduleId === 'licencias' ? (
        <SecondaryButton title="Ver conductor asociado" icon="person-circle-outline" onPress={() => onOpenRelated('conductores', 'id', record.conductor)} />
      ) : null}
      {moduleId === 'conductores' ? (
        <>
          <Text style={styles.sectionTitle}>Información relacionada</Text>
          <SecondaryButton title="Consultar licencia" icon="card-outline" onPress={() => onOpenRelated('licencias', 'conductor', record.id)} />
          <SecondaryButton title="Consultar vehículo" icon="car-outline" onPress={() => onOpenRelated('vehiculos', 'conductor', record.id)} />
          <SecondaryButton title="Consultar rutas" icon="map-outline" onPress={() => onOpenRelated('vehiculoRuta', 'conductor', record.id)} />
          <SecondaryButton title="Consultar GPS" icon="location-outline" onPress={() => onOpenRelated('ubicaciones', 'conductor', record.id)} />
          <SecondaryButton title="Consultar calificación" icon="star-outline" onPress={() => onOpenRelated('calificaciones', 'conductor', record.id)} />
        </>
      ) : null}
      {moduleId === 'vehiculos' ? (
        <>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          {renderValue('Capacidad', record.capacidad)}
          <SecondaryButton title="Rutas asociadas" icon="git-compare-outline" onPress={() => onOpenRelated('vehiculoRuta', 'vehiculo', record.id)} />
          <SecondaryButton title="Ubicación / historial GPS" icon="location-outline" onPress={() => onOpenRelated('ubicaciones', 'vehiculo', record.id)} />
        </>
      ) : null}
      {moduleId === 'rutas' ? (
        <>
          <Text style={styles.sectionTitle}>Trazado y calles</Text>
          {renderValue('Nombre', record.nombre)}
          {renderValue('Origen', record.origen)}
          {renderValue('Destino', record.destino)}
          {renderValue('Geometría GPS', record.geometriaVerificada ? 'Verificada' : 'Pendiente de validación')}
          <SecondaryButton title="Ver trazado de ruta" icon="map-outline" onPress={() => onOpenRouteMap(record)} />
          <SecondaryButton title="Administrar puntos del trazado" icon="git-branch-outline" onPress={() => onOpenRelated('trazadosRuta', 'ruta', record.id)} />
          <SecondaryButton title="Vehículos asociados" icon="car-outline" onPress={() => onOpenRelated('vehiculoRuta', 'ruta', record.id)} />
          <Text style={styles.sectionTitle}>Calles de ida (orden recibido)</Text>
          {(record.callesIda?.length ? record.callesIda : (record.trazados || []).filter((point) => point.sentido === 'IDA').map((point) => point.calle)).length ? (record.callesIda?.length ? record.callesIda : (record.trazados || []).filter((point) => point.sentido === 'IDA').map((point) => point.calle)).map((street, index) => (
            <Text key={`ida-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <EmptyState title="Calles de ida no disponibles" />}
          <Text style={styles.sectionTitle}>Calles de regreso (orden recibido)</Text>
          {(record.callesRegreso?.length ? record.callesRegreso : (record.trazados || []).filter((point) => point.sentido === 'REGRESO').map((point) => point.calle)).length ? (record.callesRegreso?.length ? record.callesRegreso : (record.trazados || []).filter((point) => point.sentido === 'REGRESO').map((point) => point.calle)).map((street, index) => (
            <Text key={`retorno-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <EmptyState title="Calles de regreso no disponibles" />}
        </>
      ) : null}
      {moduleId === 'vehiculoRuta' ? (
        <SecondaryButton title="Ver ruta asociada" icon="map-outline" onPress={() => onOpenRelated('rutas', 'id', record.ruta)} />
      ) : null}
      {moduleId === 'solicitudes' ? (
        <>
          {renderValue('Conductor', record.conductor)}
          {renderValue('Ubicación de recogida', record.puntoRecogida)}
          {renderValue('Coordenadas GPS', record.latitud_recogida == null ? 'No disponibles' : `${record.latitud_recogida}, ${record.longitud_recogida}`)}
          <SecondaryButton title="Ver pasajero asociado" icon="person-outline" onPress={() => onOpenRelated('usuarios', 'id', record.usuario)} />
          <SecondaryButton title="Ver vehículo asignado" icon="car-outline" onPress={() => onOpenRelated('vehiculos', 'id', record.vehiculo)} />
          <SecondaryButton title="Ver ruta asociada" icon="map-outline" onPress={() => onOpenRelated('rutas', 'id', record.ruta)} />
          <SecondaryButton title="Ver viaje asociado" icon="navigate-outline" onPress={() => onOpenRelated('viajes', 'solicitud', record.id)} />
        </>
      ) : null}
      {moduleId === 'viajes' ? (
        <>
          {renderValue('Inicio', record.inicio)}
          {renderValue('Fin', record.fin)}
          <SecondaryButton title="Ver solicitud asociada" icon="clipboard-outline" onPress={() => onOpenRelated('solicitudes', 'id', record.solicitud)} />
          <SecondaryButton title="Ver calificación" icon="star-outline" onPress={() => onOpenRelated('calificaciones', 'viaje', record.id)} />
        </>
      ) : null}
      {moduleId === 'calificaciones' ? (
        <SecondaryButton title="Ver viaje asociado" icon="navigate-outline" onPress={() => onOpenRelated('viajes', 'id', record.viaje)} />
      ) : null}
      {moduleId === 'ubicaciones' ? (
        <Text style={styles.bodyText}>La fecha de esta posición debe revisarse antes de considerarla actual.</Text>
      ) : null}
      {moduleId === 'emergencias' ? (
        <DataCard>
          {renderValue('Observación', record.observacion)}
          {renderValue('Ubicación', record.latitud == null || record.longitud == null ? null : `${record.latitud}, ${record.longitud}`)}
        </DataCard>
      ) : null}
    </Page>
  );
}

function AdminRouteMap({ route, onBack }) {
  const [traces, setTraces] = useState(route?.trazados || []);
  const [traceError, setTraceError] = useState('');

  useEffect(() => {
    if (!DEMO_MODE) {
      setTraces(route?.trazados || []);
      return undefined;
    }
    let mounted = true;
    setTraceError('');
    listRecords('trazadosRuta')
      .then((records) => {
        if (mounted) setTraces(records.filter((point) => String(point.ruta) === String(route?.id)));
      })
      .catch((loadError) => {
        if (mounted) setTraceError(loadError.message || 'No se pudieron cargar los puntos del trazado.');
      });
    return () => { mounted = false; };
  }, [route?.id]);

  const coordinates = (direction) => traces
    .filter((point) => point.sentido === direction)
    .map((point) => ({ latitude: Number(point.latitud), longitude: Number(point.longitud) }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  const ida = route?.coordenadasIda?.length ? route.coordenadasIda : coordinates('IDA');
  const regreso = route?.coordenadasRegreso?.length ? route.coordenadasRegreso : coordinates('REGRESO');
  return (
    <Screen>
      <Header title={`Trazado · ${route?.folio || ''}`} subtitle="Visualización sin editar coordenadas" onBack={onBack} />
      <View style={styles.mapBody}>
        <View style={styles.mapNotice}>
          <DemoBanner>
            {traceError || ((ida.length > 1 || regreso.length > 1)
              ? (DEMO_MODE ? 'Trazado de demostración, sin coordenadas inventadas.' : 'Trazado cargado desde la base de datos.')
              : 'No hay geometría GPS cargada. No se dibuja ninguna línea artificial.')}
          </DemoBanner>
        </View>
        <MapView provider={PROVIDER_DEFAULT} style={styles.routeMap} initialRegion={REGION_LA_GRANJA}>
          {ida.length > 1 ? <Polyline coordinates={ida} strokeColor={COLORES.verde} strokeWidth={6} /> : null}
          {regreso.length > 1 ? <Polyline coordinates={regreso} strokeColor="#2878D7" strokeWidth={5} lineDashPattern={[6, 6]} /> : null}
        </MapView>
        <ScrollView style={styles.mapRouteInfo} contentContainerStyle={styles.mapRouteInfoContent}>
          <Text style={styles.sectionTitle}>Folio {route?.folio}</Text>
          <Text style={styles.secondaryText}>Origen/destino y trazado GPS: solo mostrar cuando existan datos confiables.</Text>
          <Text style={styles.bodyText}>Los puntos GPS no se modifican ni interpolan automáticamente.</Text>
          <Text style={styles.bodyText}>Puntos GPS ida: {ida.length} · regreso: {regreso.length}</Text>
          <Text style={styles.sectionTitle}>Calles de ida</Text>
          {(route?.callesIda?.length ? route.callesIda : (route?.trazados || []).filter((point) => point.sentido === 'IDA').map((point) => point.calle)).length ? (route?.callesIda?.length ? route.callesIda : (route?.trazados || []).filter((point) => point.sentido === 'IDA').map((point) => point.calle)).map((street, index) => (
            <Text key={`ida-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <Text style={styles.secondaryText}>No hay calles cargadas.</Text>}
          <Text style={styles.sectionTitle}>Calles de regreso</Text>
          {(route?.callesRegreso?.length ? route.callesRegreso : (route?.trazados || []).filter((point) => point.sentido === 'REGRESO').map((point) => point.calle)).length ? (route?.callesRegreso?.length ? route.callesRegreso : (route?.trazados || []).filter((point) => point.sentido === 'REGRESO').map((point) => point.calle)).map((street, index) => (
            <Text key={`regreso-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <Text style={styles.secondaryText}>No hay calles cargadas.</Text>}
        </ScrollView>
      </View>
    </Screen>
  );
}

function AdminReports({ onBack }) {
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all(['conductores', 'vehiculos', 'solicitudes', 'viajes', 'calificaciones', 'emergencias', 'rutas']
      .map(async (collection) => [collection, (await listRecords(collection)).length]))
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch((loadError) => setError(loadError.message));
  }, []);
  return (
    <Page title="Reportes" subtitle={DEMO_MODE ? 'Indicadores locales de demostración' : 'Indicadores del servidor'} onBack={onBack}>
      <DemoBanner>{DEMO_MODE ? 'Estadísticas MOCK; no son estadísticas reales de CONATACOCH.' : 'Indicadores calculados con datos del servidor.'}</DemoBanner>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.statsGrid}>
        {[
          ['Conductores', counts.conductores],
          ['Vehículos activos DEMO', counts.vehiculos],
          ['Solicitudes DEMO', counts.solicitudes],
          ['Viajes DEMO', counts.viajes],
          ['Calificaciones DEMO', counts.calificaciones],
          ['Emergencias MOCK', counts.emergencias],
          ['Rutas registradas', counts.rutas],
        ].map(([label, value]) => <StatCard key={label} label={label} value={value ?? '...'} icon="bar-chart-outline" />)}
      </View>
    </Page>
  );
}

function AdminProfile({ user, onLogout }) {
  return (
    <Page title="Perfil administrador">
      {DEMO_MODE ? <DemoBanner>Cuenta de demostración.</DemoBanner> : null}
      <DataCard>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Nombre</Text><Text style={styles.detailValue}>{user.nombre}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Correo</Text><Text style={styles.detailValue}>{user.correo}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Rol</Text><Text style={styles.detailValue}>ADMIN</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Estado</Text><Text style={styles.detailValue}>ACTIVO</Text></View>
      </DataCard>
      <Text style={styles.bodyText}>El cambio de contraseña debe gestionarse por personal autorizado.</Text>
      <DangerButton title="Cerrar sesión" icon="log-out-outline" onPress={onLogout} />
    </Page>
  );
}

function AdminSettings({ onBack, onLogout }) {
  return (
    <Page title="Configuración" subtitle="Preferencias generales de la consola" onBack={onBack}>
      {DEMO_MODE ? <DemoBanner>Los ajustes del sistema real deben ser gestionados por el backend.</DemoBanner> : null}
      <DataCard>
        <Text style={styles.sectionTitle}>Sistema</Text>
        <Text style={styles.bodyText}>Modo actual: {DEMO_MODE ? 'DEMO local' : 'API con base de datos'}</Text>
        <Text style={styles.bodyText}>Notificaciones: {DEMO_MODE ? 'solo datos de muestra' : 'alertas persistidas en el servidor'}</Text>
        <Text style={styles.bodyText}>Seguridad: {DEMO_MODE ? 'sesión simulada' : 'token de acceso protegido'}</Text>
        <Text style={styles.bodyText}>GPS: posiciones reales recientes cuando están disponibles</Text>
      </DataCard>
      <DangerButton title="Cerrar sesión" icon="log-out-outline" onPress={onLogout} />
    </Page>
  );
}

function AdminTabBar({ active, onChange }) {
  return (
    <View style={styles.tabBar}>
      {MENU_ITEMS.slice(0, 5).map((item) => (
        <TouchableOpacity key={item.id} style={styles.tabItem} onPress={() => onChange(item.id)}>
          <Ionicons name={item.icon} size={20} color={active === item.id ? COLORES.verde : '#555555'} />
          <Text numberOfLines={1} style={[styles.tabText, active === item.id && styles.tabTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.tabItem} onPress={() => onChange('sistema')}>
        <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color={active === 'sistema' ? COLORES.verde : '#555555'} />
        <Text style={[styles.tabText, active === 'sistema' && styles.tabTextActive]}>Más</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdminNavigator({ onLogout }) {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [detail, setDetail] = useState(null);
  const [detailModule, setDetailModule] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [relatedFilter, setRelatedFilter] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);

  const logout = async () => {
    try {
      await logoutSession();
    } catch (logoutError) {
      Alert.alert('Sesión cerrada localmente', logoutError.message || 'No se pudo revocar la sesión en el servidor.');
    }
    setUser(null);
    setScreen('dashboard');
    setDetail(null);
    setDetailModule(null);
    setRelatedFilter(null);
    setNavigationStack([]);
    if (onLogout) onLogout();
  };

  const openScreen = (next) => {
    setNavigationStack([]);
    setDetail(null);
    setDetailModule(null);
    setRelatedFilter(null);
    setScreen(next);
  };

  const openRelated = (next, field, value) => {
    setNavigationStack((stack) => [...stack, {
      screen,
      detail,
      detailModule,
      relatedFilter,
    }]);
    setDetail(null);
    setDetailModule(null);
    setRelatedFilter({ field, value });
    setScreen(next);
  };

  const backToAdmin = () => {
    const previous = navigationStack[navigationStack.length - 1];
    if (previous) {
      setNavigationStack((stack) => stack.slice(0, -1));
      setScreen(previous.screen);
      setDetail(previous.detail);
      setDetailModule(previous.detailModule);
      setRelatedFilter(previous.relatedFilter);
      setSelectedRoute(null);
      return;
    }
    setDetail(null);
    setDetailModule(null);
    setSelectedRoute(null);
    setRelatedFilter(null);
    setScreen('dashboard');
  };

  const openDetail = (moduleId, record) => {
    setDetailModule(moduleId);
    setDetail(record);
  };

  const currentContent = useMemo(() => {
    if (selectedRoute) return <AdminRouteMap route={selectedRoute} onBack={() => setSelectedRoute(null)} />;
    if (detail && detailModule) {
      return (
        <AdminRecordDetail
          moduleId={detailModule}
          record={detail}
          onBack={() => { setDetail(null); setDetailModule(null); }}
          onOpen={openScreen}
          onOpenRelated={openRelated}
          onOpenRouteMap={setSelectedRoute}
        />
      );
    }
    if (MODULES[screen]) {
      return (
        <AdminModuleScreen
          moduleId={screen}
          onBack={backToAdmin}
          onDetail={(record) => openDetail(screen, record)}
          onOpenRouteMap={setSelectedRoute}
          relatedFilter={relatedFilter}
          onClearFilter={() => setRelatedFilter(null)}
        />
      );
    }
    if (screen === 'reportes') return <AdminReports onBack={backToAdmin} />;
    if (screen === 'perfil') return <AdminProfile user={user} onLogout={logout} />;
    if (screen === 'configuracion') return <AdminSettings onBack={backToAdmin} onLogout={logout} />;
    if (screen === 'dashboard') return <AdminDashboardScreen onOpen={openScreen} />;
    return <CategoryScreen category={screen} onOpen={openScreen} />;
  }, [selectedRoute, detail, detailModule, screen, user, relatedFilter, navigationStack]);

  if (!user) return <AdminLoginScreen onSuccess={setUser} onBack={onLogout} />;

  return (
    <View style={styles.adminContainer}>
      <View style={styles.adminContent}>{currentContent}</View>
      {!selectedRoute && !detail ? <AdminTabBar active={screen} onChange={openScreen} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  adminContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  adminContent: { flex: 1 },
  loginBody: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  loginForm: { paddingHorizontal: 25, paddingTop: 38, paddingBottom: 36 },
  showPassword: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, marginTop: -8, marginBottom: 16 },
  secondaryText: { color: '#666666', fontSize: 12, lineHeight: 18 },
  securityNotice: { color: '#666666', fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: 'center' },
  error: { color: '#B00020', fontSize: 14, lineHeight: 20, marginVertical: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 9 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  moduleTile: {
    width: '48%',
    minHeight: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 13,
    justifyContent: 'center',
    gap: 7,
    elevation: 1,
  },
  moduleTitle: { color: '#222222', fontSize: 13, fontWeight: '700' },
  sectionTitle: { color: '#111111', fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  bodyText: { color: '#444444', fontSize: 13, lineHeight: 19, marginVertical: 3 },
  moduleListSurface: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  moduleList: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 32, flexGrow: 1, gap: 12 },
  filterScroll: { flexGrow: 0, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#DDDDDD', marginRight: 7 },
  filterChipActive: { backgroundColor: '#1A9C43', borderColor: '#1A9C43' },
  filterText: { color: '#444444', fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  createButton: { marginBottom: 10 },
  loadingText: { color: '#666666', textAlign: 'center', marginVertical: 14 },
  recordTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  recordIcon: { width: 37, height: 37, backgroundColor: '#E8F5E9', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recordText: { flex: 1, gap: 3 },
  recordTitle: { color: '#111111', fontSize: 14, fontWeight: '800' },
  recordActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  smallButton: { minHeight: 38, paddingVertical: 8, paddingHorizontal: 10, flexGrow: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  detailLabel: { flex: 1, color: '#666666', fontSize: 12 },
  detailValue: { flex: 1, color: '#222222', fontWeight: '700', textAlign: 'right', fontSize: 12 },
  streetItem: { color: '#333333', fontSize: 13, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  modalBackdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  formCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%', padding: 18 },
  modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: '#111111', fontSize: 18, fontWeight: '800', flex: 1 },
  formCancel: { marginTop: 8 },
  referenceField: { marginBottom: 12 },
  referenceButton: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  referenceValue: { flex: 1, color: '#333333', fontSize: 14 },
  referenceOptions: {
    maxHeight: 180,
    marginTop: 5,
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
  },
  referenceOptionList: { maxHeight: 156 },
  referenceOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 9, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  mapBody: {
    position: 'relative',
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  mapNotice: { paddingHorizontal: 25, paddingTop: 30 },
  monitorMap: { flex: 1 },
  mapEmpty: { position: 'absolute', top: 100, alignSelf: 'center', paddingHorizontal: 16 },
  mapRecordList: { backgroundColor: '#FFFFFF', maxHeight: 170, paddingHorizontal: 25, paddingVertical: 14, gap: 10 },
  routeMap: { flex: 1 },
  mapRouteInfo: { backgroundColor: '#FFFFFF', maxHeight: '38%', paddingHorizontal: 15 },
  mapRouteInfoContent: { paddingVertical: 8, paddingBottom: 18 },
  mapError: { position: 'absolute', top: 100, left: 12, right: 12, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8 },
  mapLoading: { position: 'absolute', top: 100, left: 12, right: 12, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E8E8', paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 18 : 7 },
  tabItem: { flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabText: { color: '#555555', fontSize: 9, fontWeight: '600' },
  tabTextActive: { color: '#1A9C43', fontWeight: '800' },
});

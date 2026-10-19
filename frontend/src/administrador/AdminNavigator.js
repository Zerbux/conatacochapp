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
import { DEMO_MODE, loginWithRole } from '../servicios/authService';
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
    searchable: ['id', 'identificador', 'nombre', 'correo', 'telefono', 'tipo'],
    fields: [
      ['nombre', 'Nombre'],
      ['identificador', 'Identificador'],
      ['correo', 'Correo', 'email-address'],
      ['telefono', 'Teléfono'],
      ['tipo', 'Tipo (TEMPORAL / REGISTRADO / ADMIN)'],
      ['estado', 'Estado'],
    ],
  },
  conductores: {
    title: 'Conductores',
    collection: 'conductores',
    icon: 'person-circle-outline',
    toggleStatus: true,
    searchable: ['id', 'rut', 'nombre', 'correo', 'comuna', 'estado'],
    fields: [
      ['rut', 'RUT DEMO / Identificador'],
      ['nombre', 'Nombre'],
      ['direccion', 'Dirección'],
      ['comuna', 'Comuna'],
      ['fono_celular', 'Teléfono celular'],
      ['fono_fijo', 'Teléfono fijo'],
      ['fono_emergencia', 'Teléfono de emergencia'],
      ['correo', 'Correo', 'email-address'],
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
      ['conductor', 'Conductor'],
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
      ['conductor', 'Conductor asignado'],
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
  vehiculoRuta: {
    title: 'Vehículo ↔ Ruta',
    collection: 'vehiculoRuta',
    icon: 'git-compare-outline',
    toggleStatus: true,
    searchable: ['id', 'vehiculo', 'patente', 'ruta', 'folio'],
    fields: [
      ['vehiculo', 'ID del vehículo'],
      ['patente', 'Patente DEMO'],
      ['ruta', 'ID de la ruta'],
      ['folio', 'Folio de ruta'],
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
      ['pasajero', 'Pasajero'],
      ['vehiculo', 'Vehículo'],
      ['conductor', 'Conductor'],
      ['ruta', 'Folio ruta'],
      ['asientos', 'Cantidad de asientos'],
      ['puntoRecogida', 'Punto de recogida DEMO'],
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
      ['solicitud', 'Solicitud'],
      ['pasajero', 'Pasajero'],
      ['conductor', 'Conductor'],
      ['vehiculo', 'Vehículo'],
      ['ruta', 'Folio ruta'],
      ['asientos', 'Cantidad de pasajeros'],
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
    searchable: ['id', 'conductor', 'vehiculo', 'fecha', 'estado'],
    filters: ['TODOS', 'ACTIVA', 'ATENDIDA', 'CERRADA'],
    fields: [
      ['estado', 'Estado (ACTIVA / ATENDIDA / CERRADA)'],
      ['observacion', 'Observación', 'default', true],
    ],
  },
  notificaciones: {
    title: 'Notificaciones',
    collection: 'notificaciones',
    icon: 'notifications-outline',
    searchable: ['id', 'tipo', 'titulo', 'detalle', 'estado'],
    readOnly: true,
  },
};

const CATEGORY_MODULES = {
  dashboard: ['usuarios', 'conductores', 'vehiculos', 'rutas', 'solicitudes', 'viajes', 'ubicaciones', 'calificaciones', 'emergencias'],
  personas: ['usuarios', 'conductores', 'licencias', 'calificaciones'],
  flota: ['vehiculos', 'rutas', 'vehiculoRuta'],
  operacion: ['solicitudes', 'viajes', 'ubicaciones'],
  control: ['emergencias', 'notificaciones'],
  sistema: ['reportes', 'perfil', 'configuracion'],
};

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', group: 'OPERACIÓN' },
  { id: 'personas', label: 'Personas', icon: 'people-outline', group: 'PERSONAS' },
  { id: 'flota', label: 'Flota', icon: 'car-outline', group: 'FLOTA' },
  { id: 'operacion', label: 'Operación', icon: 'navigate-outline', group: 'OPERACIÓN' },
  { id: 'control', label: 'Control', icon: 'shield-checkmark-outline', group: 'CONTROL' },
  { id: 'sistema', label: 'Sistema', icon: 'settings-outline', group: 'SISTEMA' },
];

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
            <DemoBanner>ACCESO DEMO: admin-demo · DEMO-ONLY. No usar cuentas reales.</DemoBanner>
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
            El acceso real debe validarse en el servidor. Esta consola utiliza datos MOCK hasta conectar una API con permisos por rol.
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
            key={screen}
            label={label}
            value={value ?? '...'}
            icon={icon}
            onPress={() => onOpen(screen)}
          />
        ))}
      </View>
      <DataCard>
        <Text style={styles.sectionTitle}>Estado del sistema</Text>
        <Text style={styles.bodyText}>Backend: no conectado desde esta consola MOCK.</Text>
        <Text style={styles.bodyText}>Autorización de roles en endpoints: requiere configuración del servidor.</Text>
        <Text style={styles.bodyText}>Monitoreo GPS: sin ubicaciones reales disponibles.</Text>
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
      <DemoBanner>Consola administrativa DEMO</DemoBanner>
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

  useEffect(() => {
    setValues(initialValues);
    setError('');
  }, [initialValues, visible]);

  if (!module) return null;

  const save = async () => {
    const optionalFields = new Set(['estado', 'fono_fijo', 'fono_emergencia', 'descripcion', 'biometria_activa', 'activo']);
    const required = (module.fields || []).filter(([key]) => !optionalFields.has(key));
    if (required.some(([key]) => values[key] == null || String(values[key]).trim() === '')) {
      setError('Completa los campos requeridos antes de guardar.');
      return;
    }
    if (module.collection === 'vehiculos') {
      const capacity = Number(values.capacidad);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 4) {
        setError('La capacidad debe ser un número entre 1 y 4.');
        return;
      }
    }
    if (module.collection === 'usuarios' && values.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo)) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (module.collection === 'conductores' && values.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo)) {
      setError('Ingresa un correo válido.');
      return;
    }
    if (module.collection === 'usuarios' && !['TEMPORAL', 'REGISTRADO', 'ADMIN'].includes(String(values.tipo).toUpperCase())) {
      setError('El tipo debe ser TEMPORAL, REGISTRADO o ADMIN.');
      return;
    }
    if (module.collection === 'licencias') {
      if (!['A2', 'A3'].includes(String(values.clase).toUpperCase())) {
        setError('La clase de licencia debe ser A2 o A3.');
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
    if (['solicitudes', 'viajes'].includes(module.collection)) {
      const seats = Number(values.asientos);
      if (!Number.isInteger(seats) || seats < 1 || seats > 4) {
        setError('La cantidad de pasajeros debe estar entre 1 y 4.');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...values };
      if (module.collection === 'vehiculos') payload.capacidad = Number(payload.capacidad);
      if (module.collection === 'conductores') payload.biometria_activa = String(payload.biometria_activa).toLowerCase() === 'true';
      if (module.collection === 'vehiculoRuta') payload.activo = String(payload.activo).toLowerCase() !== 'false';
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
            {(module.fields || []).map(([key, label, keyboardType, multiline]) => (
              <Field
                key={key}
                label={label}
                value={values[key]}
                onChangeText={(text) => setValues((current) => ({ ...current, [key]: text }))}
                keyboardType={keyboardType}
                multiline={multiline}
              />
            ))}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <PrimaryButton title={saving ? 'Guardando...' : 'Guardar'} disabled={saving} onPress={save} />
            <SecondaryButton title="Cancelar" onPress={onCancel} style={styles.formCancel} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RecordCard({ item, module, onOpen, onEdit, onToggle }) {
  const title = item.nombre || item.titulo || item.folio || item.patente || item.rut || item.id;
  const secondary = item.correo || item.estado || item.tipo || item.ruta || item.comuna || '';
  const status = item.estado || (item.activo === false ? 'INACTIVO' : item.activo === true ? 'ACTIVO' : null);
  const active = typeof item.is_active === 'boolean'
    ? item.is_active
    : typeof item.activo === 'boolean'
      ? item.activo
      : String(item.estado || '').toUpperCase().startsWith('ACTIVO');
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

function AdminModuleScreen({ moduleId, onBack, onDetail, onOpenRouteMap }) {
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
    const query = search.trim().toLowerCase();
    const matchText = !query || module.searchable.some((key) => String(record[key] ?? '').toLowerCase().includes(query));
    if (!matchText) return false;
    if (filter === 'TODOS') return true;
    if (moduleId === 'licencias') return String(record.clase).toUpperCase() === filter || String(record.estado).toUpperCase().includes(filter);
    if (moduleId === 'calificaciones') return String(record.puntaje) === filter;
    return String(record.estado || '').toUpperCase() === filter;
  }), [records, search, filter, module, moduleId]);

  const saveRecord = async (payload) => {
    if (editing) await updateRecord(module.collection, editing.id, payload);
    else await createRecord(module.collection, payload);
    setFormVisible(false);
    setEditing(null);
    await load();
    Alert.alert('Guardado', 'El registro MOCK se actualizó correctamente.');
  };

  const toggleRecord = async () => {
    if (!pendingToggle) return;
    try {
      const isActive = typeof pendingToggle.is_active === 'boolean'
        ? pendingToggle.is_active
        : typeof pendingToggle.activo === 'boolean'
          ? pendingToggle.activo
          : String(pendingToggle.estado || '').toUpperCase().startsWith('ACTIVO');
      await setRecordActive(module.collection, pendingToggle.id, !isActive);
      setPendingToggle(null);
      await load();
    } catch (toggleError) {
      setError(toggleError.message || 'No se pudo cambiar el estado.');
      setPendingToggle(null);
    }
  };

  const renderRecord = ({ item }) => (
    <RecordCard
      item={item}
      module={module}
      onOpen={onDetail}
      onEdit={(record) => { setEditing(record); setFormVisible(true); }}
      onToggle={setPendingToggle}
    />
  );

  if (module.map) {
    const now = Date.now();
    const locations = records.filter((item) => {
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
            {records.length ? records.map((item) => (
              <DataCard key={item.id} onPress={() => onDetail(item)}>
                <Text style={styles.secondaryText}>{`Vehículo ${item.vehiculo || 'no especificado'} · ${item.fecha_hora || 'fecha no disponible'} · ${item.latitud ?? '—'}, ${item.longitud ?? '—'}`}</Text>
                <StatusBadge label={locations.includes(item) ? 'GPS ACTUALIZADO' : 'GPS DESACTUALIZADO'} tone={locations.includes(item) ? 'success' : 'neutral'} />
              </DataCard>
            )) : <Text style={styles.secondaryText}>No hay registros GPS disponibles.</Text>}
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
              <Text style={styles.secondaryText}>Los datos oficiales y sus calles son de solo lectura en esta demostración.</Text>
            ) : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {loading ? <Text style={styles.loadingText}>Cargando...</Text> : null}
          </View>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No hay registros para mostrar" description={search ? 'Prueba con otro término o filtro.' : 'No hay información disponible en los datos DEMO.'} /> : null}
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

function AdminRecordDetail({ moduleId, record, onBack, onOpen, onOpenRouteMap }) {
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
  const entries = Object.entries(record).filter(([key]) => !['coordenadasIda', 'coordenadasRegreso', 'geometriaVerificada'].includes(key));

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
      {moduleId === 'conductores' ? (
        <>
          <Text style={styles.sectionTitle}>Información relacionada</Text>
          <SecondaryButton title="Consultar licencia" icon="card-outline" onPress={() => onOpen('licencias')} />
          <SecondaryButton title="Consultar vehículo" icon="car-outline" onPress={() => onOpen('vehiculos')} />
          <SecondaryButton title="Consultar rutas" icon="map-outline" onPress={() => onOpen('vehiculoRuta')} />
          <SecondaryButton title="Consultar GPS" icon="location-outline" onPress={() => onOpen('ubicaciones')} />
          <SecondaryButton title="Consultar calificación" icon="star-outline" onPress={() => onOpen('calificaciones')} />
        </>
      ) : null}
      {moduleId === 'vehiculos' ? (
        <>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          {renderValue('Capacidad', record.capacidad)}
          {renderValue('Ubicación actual', 'No hay ubicación real verificada')}
          {renderValue('Historial GPS', 'No disponible en estos datos')}
          <SecondaryButton title="Rutas asociadas" icon="git-compare-outline" onPress={() => onOpen('vehiculoRuta')} />
          <SecondaryButton title="Ubicación / historial GPS" icon="location-outline" onPress={() => onOpen('ubicaciones')} />
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
          <SecondaryButton title="Vehículos asociados" icon="car-outline" onPress={() => onOpen('vehiculoRuta')} />
          <Text style={styles.sectionTitle}>Calles de ida (orden recibido)</Text>
          {record.callesIda?.length ? record.callesIda.map((street, index) => (
            <Text key={`ida-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <EmptyState title="Calles de ida no disponibles" />}
          <Text style={styles.sectionTitle}>Calles de regreso (orden recibido)</Text>
          {record.callesRegreso?.length ? record.callesRegreso.map((street, index) => (
            <Text key={`retorno-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <EmptyState title="Calles de regreso no disponibles" />}
        </>
      ) : null}
      {moduleId === 'vehiculoRuta' ? (
        <SecondaryButton title="Ver ruta asociada" icon="map-outline" onPress={() => onOpen('rutas')} />
      ) : null}
      {moduleId === 'solicitudes' ? (
        <>
          {renderValue('Conductor', record.conductor)}
          {renderValue('Ubicación de recogida', record.puntoRecogida)}
          {renderValue('Coordenadas GPS', record.latitud == null ? 'No disponibles' : `${record.latitud}, ${record.longitud}`)}
        </>
      ) : null}
      {moduleId === 'viajes' ? (
        <>
          {renderValue('Inicio', record.inicio)}
          {renderValue('Fin', record.fin)}
          <SecondaryButton title="Ver solicitud asociada" icon="clipboard-outline" onPress={() => onOpen('solicitudes')} />
        </>
      ) : null}
      {moduleId === 'ubicaciones' ? (
        <Text style={styles.bodyText}>La fecha de esta posición debe revisarse antes de considerarla actual.</Text>
      ) : null}
      {moduleId === 'emergencias' ? (
        <DataCard>
          {renderValue('Observación', record.observacion)}
          {renderValue('Ubicación', record.ubicacion)}
        </DataCard>
      ) : null}
    </Page>
  );
}

function AdminRouteMap({ route, onBack }) {
  return (
    <Screen>
      <Header title={`Trazado · ${route?.folio || ''}`} subtitle="Visualización sin editar coordenadas" onBack={onBack} />
      <View style={styles.mapBody}>
        <View style={styles.mapNotice}>
          <DemoBanner>
            {route?.geometriaVerificada ? 'Geometría verificada.' : 'No hay geometría GPS verificada. No se dibuja ninguna línea artificial.'}
          </DemoBanner>
        </View>
        <MapView provider={PROVIDER_DEFAULT} style={styles.routeMap} initialRegion={REGION_LA_GRANJA}>
          {route?.geometriaVerificada && route.coordenadasIda?.length > 1 ? (
            <Polyline coordinates={route.coordenadasIda} strokeColor={COLORES.verde} strokeWidth={6} />
          ) : null}
          {route?.geometriaVerificada && route.coordenadasRegreso?.length > 1 ? (
            <Polyline coordinates={route.coordenadasRegreso} strokeColor="#2878D7" strokeWidth={5} lineDashPattern={[6, 6]} />
          ) : null}
        </MapView>
        <ScrollView style={styles.mapRouteInfo} contentContainerStyle={styles.mapRouteInfoContent}>
          <Text style={styles.sectionTitle}>Folio {route?.folio}</Text>
          <Text style={styles.secondaryText}>Origen/destino y trazado GPS: solo mostrar cuando existan datos confiables.</Text>
          <Text style={styles.bodyText}>Los puntos GPS no se modifican ni interpolan automáticamente.</Text>
          <Text style={styles.bodyText}>Puntos GPS ida: {route?.coordenadasIda?.length || 0} · regreso: {route?.coordenadasRegreso?.length || 0}</Text>
          <Text style={styles.sectionTitle}>Calles de ida</Text>
          {route?.callesIda?.length ? route.callesIda.map((street, index) => (
            <Text key={`ida-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
          )) : <Text style={styles.secondaryText}>No hay calles cargadas.</Text>}
          <Text style={styles.sectionTitle}>Calles de regreso</Text>
          {route?.callesRegreso?.length ? route.callesRegreso.map((street, index) => (
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
      <DemoBanner>Cuenta de demostración.</DemoBanner>
      <DataCard>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Nombre</Text><Text style={styles.detailValue}>{user.nombre}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Correo</Text><Text style={styles.detailValue}>{user.correo}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Rol</Text><Text style={styles.detailValue}>ADMIN</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Estado</Text><Text style={styles.detailValue}>ACTIVO (DEMO)</Text></View>
      </DataCard>
      <Text style={styles.bodyText}>El cambio de contraseña requiere el servicio de autenticación del servidor.</Text>
      <DangerButton title="Cerrar sesión" icon="log-out-outline" onPress={onLogout} />
    </Page>
  );
}

function AdminSettings({ onBack, onLogout }) {
  return (
    <Page title="Configuración" subtitle="Preferencias generales de la consola" onBack={onBack}>
      <DemoBanner>Los ajustes del sistema real deben ser gestionados por el backend.</DemoBanner>
      <DataCard>
        <Text style={styles.sectionTitle}>Sistema</Text>
        <Text style={styles.bodyText}>Modo actual: MOCK</Text>
        <Text style={styles.bodyText}>Notificaciones: solo visualización de muestra</Text>
        <Text style={styles.bodyText}>Seguridad: roles deben validarse en el servidor</Text>
        <Text style={styles.bodyText}>Permisos: sin ubicación administrativa en tiempo real</Text>
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

  const logout = () => {
    setUser(null);
    setScreen('dashboard');
    setDetail(null);
    setDetailModule(null);
    if (onLogout) onLogout();
  };

  const openScreen = (next) => {
    setDetail(null);
    setDetailModule(null);
    setScreen(next);
  };

  const backToAdmin = () => {
    setDetail(null);
    setDetailModule(null);
    setSelectedRoute(null);
    if (MODULES[screen]) return;
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
        />
      );
    }
    if (screen === 'reportes') return <AdminReports onBack={backToAdmin} />;
    if (screen === 'perfil') return <AdminProfile user={user} onLogout={logout} />;
    if (screen === 'configuracion') return <AdminSettings onBack={backToAdmin} onLogout={logout} />;
    if (screen === 'dashboard') return <AdminDashboardScreen onOpen={openScreen} />;
    return <CategoryScreen category={screen} onOpen={openScreen} />;
  }, [selectedRoute, detail, detailModule, screen, user]);

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
  filterChipActive: { backgroundColor: '#149E2D', borderColor: '#149E2D' },
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
  tabTextActive: { color: '#149E2D', fontWeight: '800' },
});

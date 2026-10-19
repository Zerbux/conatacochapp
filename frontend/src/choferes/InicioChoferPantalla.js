import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLORES,
  ConfirmModal,
  DataCard,
  DemoBanner,
  DangerButton,
  EmptyState,
  Field,
  Header,
  Page,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
  VehicleCard,
} from '../componentes/KitUI';
import { rutasConatacoch } from '../pantallas/rutasConatacoch';
import { createRecord, listRecords, updateRecord } from '../servicios/dataService';
import { DEMO_MODE, loginWithRole } from '../servicios/authService';
import {
  getCurrentLocation,
  requestForegroundLocationPermission,
  watchCurrentLocation,
} from '../servicios/locationService';

const REGION_LA_GRANJA = {
  latitude: -33.5385,
  longitude: -70.6278,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: 'home-outline' },
  { id: 'ruta', label: 'Ruta', icon: 'map-outline' },
  { id: 'alertas', label: 'Alertas', icon: 'notifications-outline' },
  { id: 'perfil', label: 'Perfil', icon: 'person-outline' },
];

const DRIVER_LINKS = [
  { id: 'ruta', label: 'Mi recorrido', icon: 'map' },
  { id: 'historial', label: 'Historial de viajes', icon: 'time' },
  { id: 'vehiculo', label: 'Mi vehículo', icon: 'car-sport' },
  { id: 'licencia', label: 'Licencia', icon: 'card' },
  { id: 'gps', label: 'Estado GPS', icon: 'navigate' },
  { id: 'calificaciones', label: 'Calificaciones', icon: 'star' },
  { id: 'notificaciones', label: 'Notificaciones', icon: 'notifications' },
  { id: 'emergencia', label: 'Emergencia', icon: 'alert-circle' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings' },
];

function DriverLogin({ onSuccess, onBack }) {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('conductorBiometriaActiva')
      .then((value) => setBiometricEnabled(value === 'true'))
      .catch(() => setBiometricEnabled(false));
  }, []);

  const submitLogin = async (useBiometric = false) => {
    setError('');
    if (!useBiometric && (!credential.trim() || !password)) {
      setError('Ingresa tu identificador y contraseña.');
      return;
    }
    if (useBiometric) {
      if (!biometricEnabled || !DEMO_MODE) {
        setError('La autenticación biométrica requiere una sesión segura del servidor; aún no está disponible.');
        return;
      }
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirma tu identidad para el acceso DEMO',
          cancelLabel: 'Cancelar',
          disableDeviceFallback: false,
        });
        if (!result.success) return;
        const user = await loginWithRole('CONDUCTOR', 'conductor-demo', 'DEMO-ONLY');
        onSuccess(user);
        return;
      } catch (loginError) {
        setError(loginError.message || 'No fue posible validar el acceso biométrico.');
        return;
      }
    }

    setLoading(true);
    try {
      const user = await loginWithRole('CONDUCTOR', credential, password);
      onSuccess(user);
    } catch (loginError) {
      setError(loginError.message || 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Acceso conductor"
        subtitle="Acceso exclusivo para conductores autorizados"
        onBack={onBack}
      />
      <KeyboardAvoidingView
        style={styles.loginContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          {DEMO_MODE ? (
            <DemoBanner>
              ACCESO DEMO: conductor-demo · DEMO-ONLY. No usar credenciales reales.
            </DemoBanner>
          ) : null}
          <Field
            label="RUT o identificador"
            value={credential}
            onChangeText={setCredential}
            placeholder="Identificador del conductor"
          />
          <View>
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORES.gris} />
              <Text style={styles.passwordToggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          <PrimaryButton
            title={loading ? 'Ingresando...' : 'Ingresar'}
            icon="log-in-outline"
            disabled={loading}
            onPress={() => submitLogin(false)}
            style={styles.loginButton}
          />
          {biometricEnabled ? (
            <SecondaryButton
              title="Ingresar con biometría"
              icon="finger-print"
              onPress={() => submitLogin(true)}
              style={styles.loginButton}
            />
          ) : null}
          <SecondaryButton title="Recuperar contraseña" onPress={() => Alert.alert(
            'Recuperación de acceso',
            'Solicita el restablecimiento de tu contraseña a un administrador de CONATACOCH.',
          )} />
          <Text style={styles.loginFootnote}>
            La biometría usa el mecanismo seguro del dispositivo. La aplicación no accede ni almacena huellas.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value == null || value === '' ? 'No disponible' : String(value)}</Text>
    </View>
  );
}

function DriverHeader({ onEmergency }) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.driverHeader, { paddingHorizontal: Math.max(14, width * 0.045) }]}>
      <Image
        source={require('../../assets/logoLPng.png')}
        style={[styles.driverLogo, { width: Math.min(width * 0.56, 210) }]}
        resizeMode="contain"
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Abrir emergencia"
        style={styles.sosButton}
        onPress={onEmergency}
      >
        <Ionicons name="alert-circle" size={19} color={COLORES.blanco} />
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

function getMapRouteCoordinates(coordinates = []) {
  if (!coordinates.length) return [];
  const stride = Math.max(1, Math.ceil(coordinates.length / 250));
  return coordinates.filter((_, index) => index % stride === 0 || index === coordinates.length - 1);
}

function DriverHome({
  availability,
  onToggleService,
  gpsLocation,
  currentTrip,
  openScreen,
  requests,
  seatCapacity,
  setSeatCapacity,
  loadingGPS,
  gpsError,
}) {
  const { width } = useWindowDimensions();
  const route = rutasConatacoch.find((item) => item.folio === '233003');
  const isInService = availability === 'DISPONIBLE' || availability === 'OCUPADO';
  const gpsActive = isInService && Boolean(gpsLocation);
  const routeCoordinates = useMemo(() => getMapRouteCoordinates(route?.coordenadasIda), [route]);
  const returnCoordinates = useMemo(() => getMapRouteCoordinates(route?.coordenadasRegreso), [route]);
  const region = gpsActive
    ? {
      latitude: gpsLocation.coords.latitude,
      longitude: gpsLocation.coords.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }
    : REGION_LA_GRANJA;

  return (
    <Screen style={styles.homeScreen}>
      <DriverHeader onEmergency={() => openScreen('emergencia')} />
      <View style={styles.homeStatus}>
        <View style={styles.homeStatusText}>
          <Text style={styles.homeStatusTitle}>{isInService ? 'En servicio' : 'Fuera de servicio'}</Text>
          <View style={styles.gpsStatus}>
            <View style={[styles.gpsStatusDot, gpsActive ? styles.gpsStatusDotOn : styles.gpsStatusDotOff]} />
            <Text style={[styles.gpsStatusLabel, gpsActive ? styles.gpsStatusTextOn : styles.gpsStatusTextOff]}>
              {gpsActive ? 'GPS Activo' : 'GPS Desactivado'}
            </Text>
          </View>
        </View>
        {currentTrip ? (
          <TouchableOpacity style={styles.currentTripButton} onPress={() => openScreen('viajeActual')}>
            <Ionicons name="navigate-outline" size={19} color={COLORES.verde} />
            <Text style={styles.currentTripLabel}>Viaje</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.homeMapWrap}>
        <MapView
          key={gpsActive ? 'service-map' : 'offline-map'}
          provider={PROVIDER_DEFAULT}
          style={styles.homeMap}
          initialRegion={region}
          mapType="standard"
          showsCompass={false}
          showsMyLocationButton={false}
        >
          {routeCoordinates.length > 1 ? (
            <Polyline coordinates={routeCoordinates} strokeColor="#D71920" strokeWidth={5} lineCap="round" lineJoin="round" />
          ) : null}
          {returnCoordinates.length > 1 ? (
            <Polyline coordinates={returnCoordinates} strokeColor="#D71920" strokeWidth={4} lineDashPattern={[7, 6]} lineCap="round" lineJoin="round" />
          ) : null}
          {gpsActive ? (
            <Marker
              coordinate={{ latitude: gpsLocation.coords.latitude, longitude: gpsLocation.coords.longitude }}
              title="Ubicación GPS del dispositivo"
              description="Posición actual, sujeta a precisión de GPS"
            >
              <View style={styles.carMarker}>
                <Ionicons name="car-sport" size={22} color="#000000" />
              </View>
            </Marker>
          ) : null}
        </MapView>
        <View style={styles.routeDemoTag}>
          <Ionicons name="information-circle-outline" size={15} color="#7A4B00" />
          <Text style={styles.routeDemoText}>Folio 233003 · trazado de referencia DEMO, no GPS verificado</Text>
        </View>
        {gpsActive && gpsLocation?.coords?.accuracy ? (
          <View style={styles.gpsAccuracyTag}>
            <Text style={styles.gpsAccuracyText}>GPS ±{Math.round(gpsLocation.coords.accuracy)} m</Text>
          </View>
        ) : null}
      </View>
      {isInService ? (
        <View style={[styles.seatControlWrap, { maxWidth: Math.min(width - 28, 420) }]}>
          <Text style={styles.seatControlLabel}>Asientos disponibles</Text>
          <View style={styles.seatControl}>
            <View style={styles.seatButtons}>
              {[1, 2, 3, 4].map((count) => (
                <TouchableOpacity
                  key={count}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar ${count} asientos disponibles`}
                  accessibilityState={{ selected: seatCapacity === count }}
                  style={[
                    styles.seatButton,
                    { width: Math.min(42, Math.max(34, (width - 130) / 5)) },
                    seatCapacity === count && styles.seatButtonSelected,
                  ]}
                  onPress={() => setSeatCapacity(count)}
                >
                  <Text style={styles.seatButtonText}>{count}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dejar todos los asientos no disponibles"
                style={[styles.seatButton, styles.clearSeatsButton, { width: Math.min(42, Math.max(34, (width - 130) / 5)) }]}
                onPress={() => setSeatCapacity(0)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORES.blanco} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
      {gpsError ? <Text accessibilityRole="alert" style={styles.homeGpsError}>{gpsError}</Text> : null}
      {requests.filter((item) => item.estado === 'PENDIENTE').length ? (
        <TouchableOpacity style={styles.pendingRequestLink} onPress={() => openScreen('solicitudes')}>
          <Text style={styles.pendingRequestText}>
            Ver solicitudes ({requests.filter((item) => item.estado === 'PENDIENTE').length})
          </Text>
          <Ionicons name="chevron-forward" size={17} color={COLORES.verde} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.serviceActionWrap}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={Boolean(currentTrip) || loadingGPS}
          onPress={onToggleService}
          style={[
            styles.serviceAction,
            isInService ? styles.serviceActionOff : styles.serviceActionOn,
            (Boolean(currentTrip) || loadingGPS) && styles.serviceActionDisabled,
          ]}
        >
          {loadingGPS ? <Text style={styles.serviceActionText}>Activando GPS...</Text> : (
            <>
              <Ionicons name={isInService ? 'stop-circle-outline' : 'power-outline'} size={21} color={COLORES.blanco} />
              <Text style={styles.serviceActionText}>
                {currentTrip ? 'Viaje en curso' : isInService ? 'Salir de servicio' : 'Entrar en servicio'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {currentTrip ? (
          <Text style={styles.serviceActionHint}>Finaliza el viaje actual antes de salir de servicio.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

function RequestCard({ request, onPress }) {
  const tone = request.estado === 'PENDIENTE' ? 'warning' : request.estado === 'ACEPTADA' ? 'success' : 'neutral';
  return (
    <DataCard onPress={onPress}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>Solicitud {request.id}</Text>
        <StatusBadge label={request.estado} tone={tone} />
      </View>
      <InfoRow label="Hora" value={request.hora || request.fecha} />
      <InfoRow label="Pasajeros" value={request.asientos} />
      <InfoRow label="Recogida" value={request.puntoRecogida} />
      <InfoRow label="Ruta" value={`Folio ${request.ruta}`} />
    </DataCard>
  );
}

function RequestDetails({ request, onBack, onDecision }) {
  if (!request) {
    return <Page title="Solicitud" onBack={onBack}><EmptyState title="Solicitud no disponible" /></Page>;
  }
  return (
    <Page title={`Solicitud ${request.id}`} subtitle="Información mínima para decidir" onBack={onBack}>
      <DemoBanner>La solicitud y los datos del pasajero son MOCK.</DemoBanner>
      <DataCard>
        <InfoRow label="Pasajero" value={request.pasajero} />
        <InfoRow label="Cantidad de pasajeros" value={request.asientos} />
        <InfoRow label="Punto de recogida" value={request.puntoRecogida} />
        <InfoRow label="Ruta" value={`Folio ${request.ruta}`} />
        <InfoRow label="Distancia aproximada" value="No disponible en datos DEMO" />
        <InfoRow label="Tiempo estimado" value="No disponible" />
        <InfoRow label="Estado" value={request.estado} />
      </DataCard>
      {request.estado === 'PENDIENTE' ? (
        <View style={styles.decisionButtons}>
          <PrimaryButton title="ACEPTAR" icon="checkmark-circle-outline" onPress={() => onDecision('ACEPTADA')} style={styles.decisionButton} />
          <DangerButton title="RECHAZAR" icon="close-circle-outline" onPress={() => onDecision('RECHAZADA')} style={styles.decisionButton} />
        </View>
      ) : null}
    </Page>
  );
}

function TripScreen({ trip, gpsLocation, onBack, onAction }) {
  if (!trip) return <Page title="Viaje actual" onBack={onBack}><EmptyState title="No hay un viaje activo" /></Page>;
  const coordinate = gpsLocation
    ? { latitude: gpsLocation.coords.latitude, longitude: gpsLocation.coords.longitude }
    : null;
  const confirm = (action) => {
    const labels = {
      EN_CURSO: ['Iniciar viaje', '¿Confirmas que el viaje ha comenzado?'],
      FINALIZADO: ['Finalizar viaje', '¿Confirmas que el viaje terminó?'],
      CANCELADO: ['Cancelar viaje', '¿Quieres cancelar este viaje?'],
    };
    Alert.alert(labels[action][0], labels[action][1], [
      { text: 'Volver', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: () => onAction(action) },
    ]);
  };

  return (
    <Page title="Viaje actual" subtitle={`Estado: ${trip.estado}`} onBack={onBack}>
      <DemoBanner>Viaje MOCK · Las ubicaciones del mapa son del GPS del dispositivo.</DemoBanner>
      <DataCard>
        <InfoRow label="ID" value={trip.id} />
        <InfoRow label="Ruta" value={`Folio ${trip.ruta}`} />
        <InfoRow label="Pasajero" value={trip.pasajero} />
        <InfoRow label="Pasajeros" value={trip.asientos} />
        <InfoRow label="Punto de recogida" value={trip.puntoRecogida} />
        <InfoRow label="Estado" value={trip.estado} />
      </DataCard>
      <View style={styles.tripMap}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={coordinate ? { ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 } : REGION_LA_GRANJA}
        >
          {coordinate ? <Marker coordinate={coordinate} title="Ubicación actual del dispositivo" /> : null}
        </MapView>
      </View>
      {!coordinate ? <Text style={styles.muted}>Activa el GPS para mostrar tu ubicación actual.</Text> : null}
      {trip.estado === 'PROGRAMADO' ? (
        <PrimaryButton title="INICIAR VIAJE" icon="play-circle-outline" onPress={() => confirm('EN_CURSO')} style={styles.bigButton} />
      ) : null}
      {trip.estado === 'EN_CURSO' ? (
        <>
          <PrimaryButton title="FINALIZAR VIAJE" icon="checkmark-circle-outline" onPress={() => confirm('FINALIZADO')} style={styles.bigButton} />
          <DangerButton title="CANCELAR VIAJE" icon="close-circle-outline" onPress={() => confirm('CANCELADO')} style={styles.bigButton} />
        </>
      ) : null}
    </Page>
  );
}

function GenericList({ title, subtitle, items, renderItem, onBack, emptyTitle }) {
  return (
    <Page title={title} subtitle={subtitle} onBack={onBack}>
      {items.length ? items.map((item) => (
        <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
      )) : <EmptyState title={emptyTitle || 'No hay información disponible'} />}
    </Page>
  );
}

function DriverRequestsScreen({ requests, onOpenRequest, onBack }) {
  const pending = requests.filter((item) => item.estado === 'PENDIENTE');
  return (
    <GenericList
      title="Solicitudes recibidas"
      subtitle="Revisa la información cuando sea seguro"
      items={pending}
      onBack={onBack}
      emptyTitle="No hay solicitudes pendientes"
      renderItem={(item) => (
        <RequestCard request={item} onPress={() => onOpenRequest(item)} />
      )}
    />
  );
}

function DriverAlerts({ requests, onOpenRequest, onOpenNotifications, onOpenEmergency }) {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    listRecords('notificaciones')
      .then(setNotifications)
      .catch((loadError) => setError(loadError.message || 'No se pudieron cargar las alertas.'));
  }, []);
  const pending = requests.filter((item) => item.estado === 'PENDIENTE');
  return (
    <Page title="Alertas" subtitle="Solicitudes y avisos para el conductor">
      <DemoBanner>Los avisos y solicitudes visibles en DEMO no son operaciones reales.</DemoBanner>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
      <View style={styles.alertActionRow}>
        <SecondaryButton title="Notificaciones" icon="notifications-outline" onPress={onOpenNotifications} style={styles.alertActionButton} />
        <DangerButton title="SOS" icon="alert-circle-outline" onPress={onOpenEmergency} style={styles.alertActionButton} />
      </View>
      <Text style={styles.sectionTitle}>Solicitudes pendientes ({pending.length})</Text>
      {pending.length ? pending.map((item) => (
        <RequestCard key={item.id} request={item} onPress={() => onOpenRequest(item)} />
      )) : <EmptyState title="No hay solicitudes pendientes" description="Las nuevas solicitudes aparecerán aquí." icon="checkmark-circle-outline" />}
      <Text style={styles.sectionTitle}>Avisos recientes</Text>
      {notifications.length ? notifications.slice(0, 5).map((item) => (
        <DataCard key={item.id}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>{item.titulo || 'Notificación'}</Text>
            <StatusBadge label={item.estado || 'AVISO'} />
          </View>
          <Text style={styles.bodyText}>{item.detalle || 'Sin detalle disponible.'}</Text>
          <Text style={styles.muted}>{item.fecha || 'Fecha no disponible'} · {item.tipo || 'Sistema'}</Text>
        </DataCard>
      )) : <EmptyState title="No hay avisos recientes" icon="notifications-outline" />}
    </Page>
  );
}

function DriverProfile({ user, onOpen, onLogout }) {
  return (
    <Page title="Perfil conductor" subtitle="Información de demostración">
      <DemoBanner>No se muestran contraseñas ni datos personales reales.</DemoBanner>
      <DataCard>
        <InfoRow label="Nombre" value={user.nombre} />
        <InfoRow label="RUT" value="RUT DEMO 001" />
        <InfoRow label="Dirección" value="Dirección DEMO" />
        <InfoRow label="Comuna" value="Comuna DEMO" />
        <InfoRow label="Teléfono celular" value="No disponible DEMO" />
        <InfoRow label="Teléfono fijo" value="No disponible DEMO" />
        <InfoRow label="Teléfono emergencia" value="No disponible DEMO" />
        <InfoRow label="Correo" value={user.correo} />
        <InfoRow label="Estado" value="ACTIVO (DEMO)" />
      </DataCard>
      {DRIVER_LINKS.map((link) => (
        <SecondaryButton key={link.id} title={link.label} icon={`${link.icon}-outline`} onPress={() => onOpen(link.id)} />
      ))}
      <DangerButton title="Cerrar sesión" icon="log-out-outline" onPress={onLogout} />
    </Page>
  );
}

function DriverLicense({ onBack }) {
  const license = {
    clase: 'A2 (DEMO)',
    fecha_emision: '2024-01-01',
    comuna_emision: 'Comuna DEMO',
    fecha_vencimiento: '2027-01-01',
    estado: 'VIGENTE (DEMO)',
  };
  return (
    <Page title="Licencia de conducir" onBack={onBack}>
      <DemoBanner>Fechas y clase son datos de demostración; verificar con administración.</DemoBanner>
      <DataCard>
        <InfoRow label="Clase" value={license.clase} />
        <InfoRow label="Fecha emisión" value={license.fecha_emision} />
        <InfoRow label="Comuna emisión" value={license.comuna_emision} />
        <InfoRow label="Vencimiento" value={license.fecha_vencimiento} />
        <InfoRow label="Estado" value={license.estado} />
      </DataCard>
    </Page>
  );
}

function DriverVehicle({ onBack, onReport }) {
  return (
    <Page title="Vehículo asociado" onBack={onBack}>
      <DemoBanner>Vehículo DEMO. Los campos críticos son solo de lectura.</DemoBanner>
      <VehicleCard title="Vehículo asociado" subtitle="Información de demostración" status="MOCK">
        <InfoRow label="Patente" value="DEMO-001" />
        <InfoRow label="Marca / modelo" value="Marca DEMO · Modelo DEMO" />
        <InfoRow label="Año" value="DEMO" />
        <InfoRow label="Capacidad" value="4" />
        <InfoRow label="Estado" value="ACTIVO (DEMO)" />
        <InfoRow label="Conductor" value="Conductor DEMO 01" />
        <InfoRow label="Rutas asociadas" value="Folio 233003 · asignación DEMO" />
      </VehicleCard>
      <SecondaryButton title="Reportar problema" icon="warning-outline" onPress={onReport} />
    </Page>
  );
}

function DriverRoute({ onBack, gpsLocation, availability }) {
  const route = rutasConatacoch.find((item) => item.folio === '233003');
  const routeCoordinates = getMapRouteCoordinates(route?.coordenadasIda);
  const returnCoordinates = getMapRouteCoordinates(route?.coordenadasRegreso);
  const gpsActive = Boolean(gpsLocation) && ['DISPONIBLE', 'OCUPADO'].includes(availability);
  return (
    <Page title="Mi recorrido" subtitle="Información registrada del recorrido" onBack={onBack}>
      <DemoBanner>El trazado rojo es una referencia DEMO y no una navegación GPS verificada.</DemoBanner>
      <View style={styles.routePreviewMap}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={gpsActive
            ? { latitude: gpsLocation.coords.latitude, longitude: gpsLocation.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : REGION_LA_GRANJA}
          mapType="standard"
        >
          {routeCoordinates.length > 1 ? (
            <Polyline coordinates={routeCoordinates} strokeColor="#D71920" strokeWidth={5} />
          ) : null}
          {returnCoordinates.length > 1 ? (
            <Polyline coordinates={returnCoordinates} strokeColor="#D71920" strokeWidth={4} lineDashPattern={[7, 6]} />
          ) : null}
          {gpsActive ? (
            <Marker coordinate={{ latitude: gpsLocation.coords.latitude, longitude: gpsLocation.coords.longitude }} title="GPS actual">
              <View style={styles.carMarker}><Ionicons name="car-sport" size={21} color="#000000" /></View>
            </Marker>
          ) : null}
        </MapView>
      </View>
      <DataCard>
        <InfoRow label="Folio" value={route?.folio} />
        <InfoRow label="Nombre" value="No disponible en los datos del proyecto" />
        <InfoRow label="Origen" value="No disponible" />
        <InfoRow label="Destino" value="No disponible" />
        <InfoRow label="Estado del trazado GPS" value="Pendiente de validación" />
        <Text style={styles.sectionTitle}>Ida</Text>
        {route?.callesIda?.length ? route.callesIda.map((street, index) => (
          <Text key={`ida-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
        )) : <Text style={styles.muted}>Calles de ida no disponibles.</Text>}
        <Text style={styles.sectionTitle}>Regreso</Text>
        {route?.callesRegreso?.length ? route.callesRegreso.map((street, index) => (
          <Text key={`regreso-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
        )) : <Text style={styles.muted}>Calles de regreso no disponibles.</Text>}
      </DataCard>
    </Page>
  );
}

function DriverRatings({ onBack }) {
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    listRecords('calificaciones')
      .then((items) => setRatings(items))
      .catch((loadError) => setError(loadError.message));
  }, []);
  if (error) return <Page title="Calificaciones" onBack={onBack}><Text style={styles.errorText}>{error}</Text></Page>;
  const average = ratings.length
    ? (ratings.reduce((sum, item) => sum + Number(item.puntaje || 0), 0) / ratings.length).toFixed(1)
    : '—';
  return (
    <Page title="Calificaciones" subtitle="Solo lectura" onBack={onBack}>
      <DemoBanner>Calificaciones MOCK; no pueden ser editadas por el conductor.</DemoBanner>
      <DataCard style={styles.ratingSummary}>
        <Text style={styles.ratingValue}>{average} / 5</Text>
        <Text style={styles.stars}>{'★'.repeat(Math.round(Number(average) || 0)) || '☆☆☆☆☆'}</Text>
        <Text style={styles.muted}>{ratings.length} calificaciones de demostración</Text>
      </DataCard>
      {ratings.map((rating) => (
        <DataCard key={rating.id}>
          <Text style={styles.cardTitle}>{'★'.repeat(rating.puntaje)} · {rating.fecha}</Text>
          <Text style={styles.bodyText}>{rating.comentario}</Text>
          <Text style={styles.muted}>Viaje {rating.viaje} · Usuario DEMO</Text>
        </DataCard>
      ))}
      {!ratings.length ? <EmptyState title="Aún no hay calificaciones" /> : null}
    </Page>
  );
}

function DriverGPS({ gpsLocation, permission, error, onRequestGPS, loading, onBack }) {
  const coordinate = gpsLocation?.coords;
  return (
    <Page title="Estado GPS" onBack={onBack}>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
      <DataCard>
        <InfoRow label="GPS" value={coordinate ? 'ACTIVO' : 'INACTIVO / SIN LECTURA'} />
        <InfoRow label="Permisos" value={permission || 'Sin consultar'} />
        <InfoRow label="Última ubicación" value={coordinate ? `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}` : 'No disponible'} />
        <InfoRow label="Última actualización" value={gpsLocation?.timestamp ? new Date(gpsLocation.timestamp).toLocaleString() : 'No disponible'} />
        <InfoRow label="Precisión" value={coordinate?.accuracy ? `±${Math.round(coordinate.accuracy)} m` : 'No disponible'} />
        <InfoRow label="Conexión" value="Estado del dispositivo; no se envían coordenadas al servidor DEMO." />
      </DataCard>
      <PrimaryButton title={loading ? 'Solicitando...' : 'Solicitar / actualizar permiso GPS'} icon="locate-outline" disabled={loading} onPress={onRequestGPS} />
    </Page>
  );
}

function DriverSettings({ onBack, onLogout, onOpen, onBiometric }) {
  return (
    <Page title="Configuración" onBack={onBack}>
      <DataCard>
        <Text style={styles.sectionTitle}>Seguridad y permisos</Text>
        <SecondaryButton title="Configurar acceso biométrico" icon="finger-print" onPress={onBiometric} />
        <SecondaryButton title="Estado y permisos GPS" icon="navigate-outline" onPress={() => onOpen('gps')} />
        <InfoRow label="Notificaciones" value="Preferencias locales DEMO" />
        <InfoRow label="Privacidad" value="No guardamos biometría ni contraseñas." />
      </DataCard>
      <DangerButton title="Cerrar sesión" icon="log-out-outline" onPress={onLogout} />
    </Page>
  );
}

function BiometricSetup({ onBack, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(null);

  useEffect(() => {
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
      .then(([hardware, enrolled]) => setSupported(hardware && enrolled))
      .catch(() => setSupported(false));
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma la seguridad de este dispositivo',
        cancelLabel: 'Cancelar',
      });
      if (result.success) {
        await AsyncStorage.setItem('conductorBiometriaActiva', 'true');
        onComplete();
      }
    } catch (error) {
      Alert.alert('No disponible', error.message || 'No se pudo configurar biometría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Acceso biométrico" subtitle="¿Quieres activar el acceso biométrico?" onBack={onBack}>
      <DataCard>
        <Ionicons name="finger-print-outline" size={42} color={COLORES.verde} />
        <Text style={styles.bodyText}>
          Se utiliza la autenticación segura del dispositivo. La app no almacena ni recibe huellas.
          En modo real, el servidor debe emitir una sesión segura para habilitar acceso sin contraseña.
        </Text>
        <Text style={styles.muted}>
          {supported === null
            ? 'Comprobando compatibilidad...'
            : !DEMO_MODE
              ? 'No disponible en modo servidor hasta implementar sesiones seguras.'
              : supported
                ? 'Dispositivo compatible.'
                : 'No hay biometría configurada o compatible.'}
        </Text>
      </DataCard>
      <PrimaryButton
        title={loading ? 'Comprobando...' : 'Activar'}
        icon="finger-print"
        disabled={!supported || loading || !DEMO_MODE}
        onPress={enable}
      />
      <SecondaryButton title="Ahora no" onPress={onBack} />
    </Page>
  );
}

function DriverNotifications({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    listRecords('notificaciones').then(setNotifications).catch((error) => Alert.alert('Error', error.message));
  }, []);
  return (
    <GenericList
      title="Notificaciones"
      subtitle="Avisos del sistema y administración"
      items={notifications}
      onBack={onBack}
      emptyTitle="No hay notificaciones nuevas"
      renderItem={(item) => (
        <DataCard>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>{item.titulo}</Text>
            <StatusBadge label={item.estado} />
          </View>
          <Text style={styles.bodyText}>{item.detalle}</Text>
          <Text style={styles.muted}>{item.fecha} · {item.tipo}</Text>
        </DataCard>
      )}
    />
  );
}

function DriverEmergency({ user, onBack }) {
  const [confirmation, setConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const recordEmergency = async () => {
    setLoading(true);
    try {
      let location = null;
      try {
        const current = await getCurrentLocation();
        location = {
          latitud: current.coords.latitude,
          longitud: current.coords.longitude,
        };
      } catch {
        location = null;
      }
      await createRecord('emergencias', {
        conductor: user.identificador,
        vehiculo: 'VEH-DEMO-001',
        fecha: new Date().toISOString(),
        ubicacion: location ? `${location.latitud}, ${location.longitud}` : 'GPS no disponible',
        estado: 'ACTIVA',
        observacion: 'Evento de prueba DEMO; no se contactó a servicios de emergencia.',
      });
      setConfirmation(false);
      Alert.alert(
        'Evento DEMO registrado',
        `Evento guardado localmente con estado ACTIVA. No se realizó ninguna llamada.${location ? ' Se adjuntó la ubicación GPS actual.' : ' No se obtuvo ubicación GPS.'}`,
      );
    } catch (error) {
      Alert.alert('No se pudo registrar', error.message || 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Emergencia" subtitle="No se realizan llamadas automáticas" onBack={onBack}>
      <DemoBanner>El botón registra un evento MOCK local. No alerta a servicios externos.</DemoBanner>
      <DataCard style={styles.emergencyCard}>
        <Ionicons name="alert-circle" size={54} color={COLORES.rojo} />
        <Text style={styles.sectionTitle}>Botón de pánico</Text>
        <Text style={styles.bodyText}>
          Úsalo solo para probar el flujo de registro. Se solicitará confirmación antes de guardar el evento.
        </Text>
        <DangerButton
          title={loading ? 'Registrando evento...' : 'BOTÓN DE PÁNICO'}
          icon="warning"
          onPress={() => setConfirmation(true)}
        />
      </DataCard>
      <ConfirmModal
        visible={confirmation}
        title="Confirmar evento de prueba"
        message="Se registrará un evento MOCK con tu identificador y, si está disponible, la ubicación GPS. No se hará ninguna llamada."
        confirmLabel="Registrar DEMO"
        danger
        onCancel={() => setConfirmation(false)}
        onConfirm={recordEmergency}
      />
    </Page>
  );
}

function DriverTripHistory({ onOpen, onBack }) {
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('TODOS');
  useEffect(() => {
    listRecords('viajes').then(setTrips).catch((error) => Alert.alert('Error', error.message));
  }, []);
  const visible = filter === 'TODOS' ? trips : trips.filter((trip) => trip.estado === filter);
  return (
    <Page title="Historial de viajes" subtitle="Registros de demostración" onBack={onBack}>
      <DemoBanner>Los viajes de esta lista son MOCK.</DemoBanner>
      <View style={styles.filterRow}>
        {['TODOS', 'FINALIZADO', 'CANCELADO'].map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => setFilter(value)}
            style={[styles.filterChip, filter === value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {visible.length ? visible.map((trip) => (
        <DataCard key={trip.id} onPress={() => onOpen(trip)}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>{trip.id}</Text>
            <StatusBadge label={trip.estado} tone={trip.estado === 'FINALIZADO' ? 'success' : 'neutral'} />
          </View>
          <InfoRow label="Fecha / hora" value={trip.inicio} />
          <InfoRow label="Ruta" value={`Folio ${trip.ruta}`} />
          <InfoRow label="Pasajeros" value={trip.asientos} />
          <InfoRow label="Calificación recibida" value={trip.calificacion ? `${trip.calificacion} / 5` : 'Sin calificación'} />
        </DataCard>
      )) : <EmptyState title="No hay viajes en este filtro" />}
    </Page>
  );
}

function TripDetail({ trip, onBack }) {
  return (
    <Page title="Detalle del viaje" onBack={onBack}>
      <DemoBanner>Detalle MOCK. No contiene datos personales reales.</DemoBanner>
      <DataCard>
        <InfoRow label="ID viaje" value={trip?.id} />
        <InfoRow label="Fecha" value={trip?.inicio} />
        <InfoRow label="Ruta" value={trip?.ruta} />
        <InfoRow label="Pasajero" value={trip?.pasajero} />
        <InfoRow label="Cantidad de pasajeros" value={trip?.asientos} />
        <InfoRow label="Hora inicio" value={trip?.horaInicio} />
        <InfoRow label="Hora fin" value={trip?.horaFin} />
        <InfoRow label="Estado" value={trip?.estado} />
        <InfoRow label="Calificación" value={trip?.calificacion ? `${trip.calificacion} / 5` : 'Sin calificación'} />
      </DataCard>
    </Page>
  );
}

function DriverTabBar({ active, onChange }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          accessibilityRole="button"
          accessibilityState={{ selected: active === tab.id }}
          style={styles.tabItem}
          onPress={() => onChange(tab.id)}
        >
          <Ionicons name={active === tab.id ? tab.icon.replace('-outline', '') : tab.icon} size={21} color={active === tab.id ? COLORES.verde : '#555555'} />
          <Text style={[styles.tabLabel, active === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function InicioChoferPantalla({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loginScreen, setLoginScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('inicio');
  const [secondaryScreen, setSecondaryScreen] = useState(null);
  const [availability, setAvailability] = useState('OFFLINE');
  const [seatCapacity, setSeatCapacity] = useState(4);
  const [requests, setRequests] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsPermission, setGpsPermission] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [settings, setSettings] = useState({ notifications: true, biometric: false });
  const [error, setError] = useState('');
  const mapSubscription = useRef(null);

  useEffect(() => {
    listRecords('solicitudes')
      .then(setRequests)
      .catch((loadError) => setError(loadError.message));
    AsyncStorage.getItem('conductorBiometriaActiva')
      .then((value) => setSettings((current) => ({ ...current, biometric: value === 'true' })))
      .catch((storageError) => setError(storageError.message));
    return () => mapSubscription.current?.remove();
  }, []);

  const requestGPS = async () => {
    setLoadingGPS(true);
    setGpsError('');
    try {
      const permission = await requestForegroundLocationPermission();
      setGpsPermission(permission);
      if (permission !== 'granted') {
        setGpsError('Permiso GPS denegado. Habilítalo desde los ajustes del dispositivo.');
        return false;
      }
      const position = await getCurrentLocation();
      setGpsLocation(position);
      return true;
    } catch (gpsFailure) {
      setGpsError(gpsFailure.message || 'No fue posible obtener la ubicación.');
      return false;
    } finally {
      setLoadingGPS(false);
    }
  };

  useEffect(() => {
    const shouldWatchGPS = ['DISPONIBLE', 'OCUPADO'].includes(availability) ||
      ['mapa', 'ruta'].includes(activeTab) ||
      secondaryScreen === 'gps';
    if (!user || !shouldWatchGPS) return undefined;
    let mounted = true;
    watchCurrentLocation((position) => { if (mounted) setGpsLocation(position); })
      .then((subscription) => {
        if (mounted) mapSubscription.current = subscription;
        else subscription.remove();
      })
      .catch((watchError) => {
        if (mounted) {
          setGpsError(watchError.message || 'No se pudo iniciar el GPS.');
          setAvailability('OFFLINE');
        }
      });
    return () => {
      mounted = false;
      mapSubscription.current?.remove();
      mapSubscription.current = null;
    };
  }, [user, activeTab, secondaryScreen, availability]);

  const toggleService = async () => {
    if (currentTrip) return;
    if (availability === 'DISPONIBLE') {
      setAvailability('OFFLINE');
      return;
    }
    const hasLocation = await requestGPS();
    if (hasLocation) setAvailability('DISPONIBLE');
  };

  const logout = () => {
    setUser(null);
    setActiveTab('inicio');
    setSecondaryScreen(null);
    setCurrentTrip(null);
    setAvailability('OFFLINE');
    if (onLogout) onLogout();
  };

  const decideRequest = async (request, decision) => {
    if (decision === 'ACEPTADA' && Number(request.asientos) > seatCapacity) {
      Alert.alert(
        'Capacidad insuficiente',
        `La solicitud requiere ${request.asientos} asientos y tienes ${seatCapacity} disponibles.`,
      );
      return;
    }
    if (decision === 'ACEPTADA' && currentTrip) {
      Alert.alert('Viaje en curso', 'Finaliza o cancela el viaje actual antes de aceptar otra solicitud.');
      return;
    }
    if (decision === 'ACEPTADA' && availability !== 'DISPONIBLE') {
      Alert.alert('No disponible', 'Marca tu estado como DISPONIBLE cuando sea seguro antes de aceptar una solicitud.');
      return;
    }
    try {
      await updateRecord('solicitudes', request.id, { estado: decision });
      const updatedRequests = await listRecords('solicitudes');
      setRequests(updatedRequests);
      setSecondaryScreen(null);
      setActiveTab('alertas');
      if (decision === 'ACEPTADA') {
        const trip = await createRecord('viajes', {
          solicitud: request.id,
          pasajero: request.pasajero,
          conductor: user.nombre,
          vehiculo: 'VEH-DEMO-001',
          ruta: request.ruta,
          asientos: request.asientos,
          puntoRecogida: request.puntoRecogida,
          estado: 'PROGRAMADO',
          inicio: new Date().toLocaleString(),
          horaInicio: '',
          horaFin: '',
          calificacion: null,
        });
        setCurrentTrip(trip);
        setAvailability('OCUPADO');
        setSecondaryScreen('viajeActual');
        Alert.alert('Solicitud aceptada', 'Se creó un viaje de demostración.');
      }
    } catch (actionError) {
      Alert.alert('No se pudo actualizar', actionError.message || 'Intenta nuevamente.');
    }
  };

  const updateTrip = async (state) => {
    try {
      const trip = { ...currentTrip, estado: state };
      if (state === 'FINALIZADO' || state === 'CANCELADO') {
        trip.horaFin = new Date().toLocaleTimeString();
        setAvailability('OFFLINE');
      }
      const updated = await updateRecord('viajes', currentTrip.id, trip);
      setCurrentTrip(state === 'FINALIZADO' || state === 'CANCELADO' ? null : updated);
      if (state === 'FINALIZADO' || state === 'CANCELADO') {
        Alert.alert('Viaje actualizado', `Estado: ${state} (DEMO).`);
      }
    } catch (actionError) {
      Alert.alert('No se pudo actualizar', actionError.message || 'Intenta nuevamente.');
    }
  };

  const openScreen = (screen) => {
    setSecondaryScreen(screen);
  };

  const goBack = () => setSecondaryScreen(null);

  const renderSecondaryScreen = () => {
    if (secondaryScreen === 'biometria') {
      return (
        <BiometricSetup
          onBack={goBack}
          onComplete={() => {
            setSettings((current) => ({ ...current, biometric: true }));
            Alert.alert('Biometría activada', 'La seguridad del dispositivo fue verificada para el acceso DEMO.');
            goBack();
          }}
        />
      );
    }
    if (secondaryScreen === 'ruta') return <DriverRoute onBack={goBack} gpsLocation={gpsLocation} availability={availability} />;
    if (secondaryScreen === 'vehiculo') return <DriverVehicle onBack={goBack} onReport={() => Alert.alert('Reporte DEMO', 'El reporte se registrará en el sistema cuando se conecte la API.')} />;
    if (secondaryScreen === 'licencia') return <DriverLicense onBack={goBack} />;
    if (secondaryScreen === 'gps') return <DriverGPS gpsLocation={gpsLocation} permission={gpsPermission} error={gpsError} onRequestGPS={requestGPS} loading={loadingGPS} onBack={goBack} />;
    if (secondaryScreen === 'calificaciones') return <DriverRatings onBack={goBack} />;
    if (secondaryScreen === 'notificaciones') return <DriverNotifications onBack={goBack} />;
    if (secondaryScreen === 'emergencia') return <DriverEmergency user={user} onBack={goBack} />;
    if (secondaryScreen === 'configuracion') return <DriverSettings onBack={goBack} onLogout={logout} onOpen={openScreen} onBiometric={() => openScreen('biometria')} />;
    if (secondaryScreen === 'viajeActual') return <TripScreen trip={currentTrip} gpsLocation={gpsLocation} onBack={goBack} onAction={updateTrip} />;
    if (secondaryScreen === 'solicitudes') {
      return (
        <DriverRequestsScreen
          requests={requests}
          onBack={goBack}
          onOpenRequest={(request) => {
            setSelectedTrip({ requestId: request.id });
            setSecondaryScreen('detalleSolicitud');
          }}
        />
      );
    }
    if (secondaryScreen === 'historial') {
      return <DriverTripHistory onBack={goBack} onOpen={(trip) => { setSelectedTrip(trip); setSecondaryScreen('detalleViaje'); }} />;
    }
    if (secondaryScreen === 'detalleSolicitud') {
      const request = requests.find((item) => item.id === selectedTrip?.requestId);
      return <RequestDetails request={request} onBack={goBack} onDecision={(decision) => decideRequest(request, decision)} />;
    }
    if (secondaryScreen === 'detalleViaje') return <TripDetail trip={selectedTrip} onBack={goBack} />;
    return (
      <Page title="Pantalla no disponible" onBack={goBack}>
        <EmptyState
          title="Esta sección aún no está disponible"
          description="Vuelve al inicio del conductor y selecciona otra opción."
          icon="construct-outline"
        />
      </Page>
    );
  };

  const renderMainTab = () => {
    if (activeTab === 'inicio') {
      return <DriverHome
        availability={availability}
        onToggleService={toggleService}
        gpsLocation={gpsLocation}
        currentTrip={currentTrip}
        openScreen={openScreen}
        requests={requests}
        seatCapacity={seatCapacity}
        setSeatCapacity={setSeatCapacity}
        loadingGPS={loadingGPS}
        gpsError={gpsError}
      />;
    }
    if (activeTab === 'ruta') {
      return <DriverRoute gpsLocation={gpsLocation} availability={availability} />;
    }
    if (activeTab === 'alertas') {
      return (
        <DriverAlerts
          requests={requests}
          onOpenRequest={(request) => {
            setSelectedTrip({ requestId: request.id });
            setSecondaryScreen('detalleSolicitud');
          }}
          onOpenNotifications={() => openScreen('notificaciones')}
          onOpenEmergency={() => openScreen('emergencia')}
        />
      );
    }
    return <DriverProfile user={user} onOpen={openScreen} onLogout={logout} />;
  };

  if (!user) {
    return loginScreen === 'biometria'
      ? <BiometricSetup onBack={() => setLoginScreen('login')} onComplete={() => setLoginScreen('login')} />
      : <DriverLogin onSuccess={setUser} onBack={onLogout} />;
  }

  if (error) {
    return (
      <Page title="Inicio conductor">
        <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
        <SecondaryButton title="Reintentar" onPress={() => {
          setError('');
          listRecords('solicitudes').then(setRequests).catch((loadError) => setError(loadError.message));
        }} />
        <DangerButton title="Cerrar sesión" onPress={logout} />
      </Page>
    );
  }

  const currentScreen = secondaryScreen ? renderSecondaryScreen() : renderMainTab();
  return (
    <View style={styles.appContainer}>
      <View style={styles.screenContent}>{currentScreen}</View>
      {!secondaryScreen ? <DriverTabBar active={activeTab} onChange={setActiveTab} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  screenContent: { flex: 1 },
  homeScreen: { backgroundColor: '#000000' },
  driverHeader: {
    minHeight: 58,
    paddingVertical: 7,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverLogo: { height: 42, maxWidth: '70%' },
  sosButton: {
    minWidth: 74,
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: '#D71920',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  sosText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  homeStatus: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  homeStatusText: { gap: 3 },
  homeStatusTitle: { color: '#111111', fontSize: 19, fontWeight: '900' },
  gpsStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsStatusDot: { width: 8, height: 8, borderRadius: 4 },
  gpsStatusDotOn: { backgroundColor: '#149E2D' },
  gpsStatusDotOff: { backgroundColor: '#D71920' },
  gpsStatusLabel: { fontSize: 12, fontWeight: '800' },
  gpsStatusTextOn: { color: '#149E2D' },
  gpsStatusTextOff: { color: '#D71920' },
  currentTripButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#149E2D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  currentTripLabel: { color: '#149E2D', fontWeight: '800', fontSize: 12 },
  homeMapWrap: { flex: 1, minHeight: 150, overflow: 'hidden', backgroundColor: '#E5E3DF' },
  homeMap: { flex: 1 },
  routeDemoTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#FFF3CD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeDemoText: { flex: 1, color: '#7A4B00', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  gpsAccuracyTag: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gpsAccuracyText: { color: '#333333', fontSize: 11, fontWeight: '700' },
  carMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  seatControlWrap: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 8,
  },
  seatControlLabel: { color: '#333333', fontWeight: '800', fontSize: 11, marginHorizontal: 4, marginBottom: 5 },
  seatControl: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 28,
    backgroundColor: '#149E2D',
    alignSelf: 'center',
  },
  seatButtons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seatButton: {
    height: 36,
    borderRadius: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  seatButtonSelected: { borderColor: '#FFFFFF', backgroundColor: '#202020' },
  seatButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  clearSeatsButton: { backgroundColor: '#D71920', borderColor: '#D71920' },
  serviceActionWrap: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 8 },
  serviceAction: {
    minHeight: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  serviceActionOn: { backgroundColor: '#149E2D' },
  serviceActionOff: { backgroundColor: '#D71920' },
  serviceActionDisabled: { opacity: 0.55 },
  serviceActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  serviceActionHint: { color: '#666666', fontSize: 11, textAlign: 'center', marginTop: 5 },
  homeGpsError: { color: '#B00020', fontSize: 11, lineHeight: 15, textAlign: 'center', paddingHorizontal: 14, paddingBottom: 5 },
  pendingRequestLink: {
    minHeight: 34,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  pendingRequestText: { color: '#149E2D', fontSize: 12, fontWeight: '800' },
  alertActionRow: { flexDirection: 'row', gap: 8 },
  alertActionButton: { flex: 1, paddingHorizontal: 8 },
  routePreviewMap: { height: 230, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  loginContent: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  loginScroll: { paddingHorizontal: 25, paddingTop: 38, paddingBottom: 32 },
  loginButton: { marginBottom: 11 },
  loginFootnote: { color: '#666666', fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  passwordToggle: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -7, marginBottom: 10 },
  passwordToggleText: { color: '#555555', fontSize: 12, fontWeight: '600' },
  errorText: { color: '#B00020', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  driverIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#149E2D', alignItems: 'center', justifyContent: 'center' },
  identityText: { flex: 1, gap: 5 },
  identityName: { color: '#111111', fontSize: 17, fontWeight: '800' },
  muted: { color: '#777777', fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionTitle: { color: '#111111', fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  infoLabel: { flex: 1, color: '#666666', fontSize: 13 },
  infoValue: { flex: 1, color: '#222222', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  linkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  quickLink: { flexGrow: 1, flexBasis: '46%', minHeight: 64, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, justifyContent: 'center', gap: 5, elevation: 1 },
  quickLinkText: { color: '#333333', fontSize: 12, fontWeight: '700' },
  map: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 },
  cardTitle: { color: '#111111', fontSize: 15, fontWeight: '800', flexShrink: 1 },
  bodyText: { color: '#444444', fontSize: 14, lineHeight: 21, marginVertical: 8 },
  decisionButtons: { gap: 12, marginTop: 8 },
  decisionButton: { minHeight: 60 },
  tripMap: { height: 240, borderRadius: 12, overflow: 'hidden', marginVertical: 8 },
  bigButton: { minHeight: 62, marginTop: 8 },
  streetItem: { color: '#333333', fontSize: 13, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  ratingSummary: { alignItems: 'center', paddingVertical: 24 },
  ratingValue: { color: '#111111', fontSize: 28, fontWeight: '900' },
  stars: { color: '#E67E22', fontSize: 24, marginVertical: 4 },
  emergencyCard: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: '#DDDDDD', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: '#149E2D', borderColor: '#149E2D' },
  filterText: { color: '#444444', fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  tabBar: { minHeight: 62, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 18 : 7, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EAEAEA', flexDirection: 'row', justifyContent: 'space-around' },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2 },
  tabLabel: { fontSize: 10, color: '#555555', fontWeight: '600' },
  tabLabelActive: { color: '#149E2D', fontWeight: '800' },
});

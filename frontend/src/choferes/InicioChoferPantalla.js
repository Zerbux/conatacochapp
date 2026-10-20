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
import { DEMO_MODE, loginWithRole, logout as logoutSession } from '../servicios/authService';
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

function DriverLogin({ onSuccess, onBack }){
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
        const user = await loginWithRole('CONDUCTOR', 'conductor-demo', 'CHOFER-ONLY');
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
              ACCESO DEMO: conductor-demo · CHOFER-ONLY. No usar credenciales reales.
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

function DriverHeader({ onEmergency, sendingSOS }) {
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
        accessibilityLabel="Enviar alerta SOS al administrador"
        accessibilityState={{ disabled: sendingSOS }}
        disabled={sendingSOS}
        style={[styles.sosButton, sendingSOS && styles.serviceActionDisabled]}
        onPress={onEmergency}
      >
        <Ionicons name="alert-circle" size={19} color={COLORES.blanco} />
        <Text style={styles.sosText}>{sendingSOS ? '...' : 'SOS'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function getMapRouteCoordinates(coordinates = []) {
  if (!coordinates.length) return [];
  const stride = Math.max(1, Math.ceil(coordinates.length / 250));
  return coordinates.filter((_, index) => index % stride === 0 || index === coordinates.length - 1);
}

function getRouteCoordinates(route, direction) {
  const points = route?.trazados
    ? route.trazados
      .filter((point) => point.sentido === direction)
      .map((point) => ({ latitude: Number(point.latitud), longitude: Number(point.longitud) }))
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    : route?.[direction === 'IDA' ? 'coordenadasIda' : 'coordenadasRegreso'] || [];
  return getMapRouteCoordinates(points);
}

function DriverHome({
  route: assignedRoute,
  availability,
  onToggleService,
  onEmergency,
  sendingSOS,
  gpsLocation,
  currentTrip,
  openScreen,
  requests,
  seatCapacity,
  onSelectSeatCapacity,
  luggageOccupied,
  onToggleLuggage,
  loadingGPS,
  gpsError,
}) {
  const { width } = useWindowDimensions();
  const route = assignedRoute || (DEMO_MODE ? rutasConatacoch.find((item) => item.folio === '233003') : null);
  const isInService = availability === 'DISPONIBLE' || availability === 'OCUPADO';
  const gpsActive = isInService && Boolean(gpsLocation);
  const routeCoordinates = useMemo(() => getRouteCoordinates(route, 'IDA'), [route]);
  const returnCoordinates = useMemo(() => getRouteCoordinates(route, 'REGRESO'), [route]);
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
      <DriverHeader onEmergency={onEmergency} sendingSOS={sendingSOS} />
      <View style={styles.homeCard}>
      <View style={styles.homeStatus}>
        <View style={styles.homeStatusText}>
          <Text style={styles.homeStatusTitle}>{isInService ? 'En servicio' : 'Fuera de servicio'}</Text>
          <View style={styles.gpsStatus}>
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
          camera={gpsActive ? {
            center: {
              latitude: gpsLocation.coords.latitude,
              longitude: gpsLocation.coords.longitude,
            },
            pitch: 50,
            heading: Number.isFinite(gpsLocation.coords.heading) ? gpsLocation.coords.heading : 0,
            altitude: 850,
            zoom: 16,
          } : undefined}
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
          <Text style={styles.routeDemoText}>{route ? `Folio ${route.folio}` : 'Sin ruta asignada'}</Text>
        </View>
        {gpsActive && gpsLocation?.coords?.accuracy ? (
          <View style={styles.gpsAccuracyTag}>
            <Text style={styles.gpsAccuracyText}>GPS ±{Math.round(gpsLocation.coords.accuracy)} m</Text>
          </View>
        ) : null}
      </View>
      {isInService ? (
        <View style={[styles.seatControlWrap, { maxWidth: Math.min(width - 28, 420) }]}>
          <Text style={styles.seatControlLabel}>Plazas disponibles: {seatCapacity}</Text>
          <View style={styles.seatControl}>
            <View style={styles.seatButtons}>
              {[1, 2, 3, 4].map((count) => (
                <TouchableOpacity
                  key={count}
                  accessibilityRole="button"
                  accessibilityLabel={`${count} ${count === 1 ? 'asiento disponible' : 'asientos disponibles'}`}
                  accessibilityState={{ selected: seatCapacity === count }}
                  style={[
                    styles.seatButton,
                    seatCapacity === count ? styles.seatButtonSelected : styles.seatButtonUnselected,
                  ]}
                  onPress={() => onSelectSeatCapacity(count)}
                >
                  <Text style={styles.seatButtonText}>{count}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Maletero ${luggageOccupied ? 'ocupado' : 'disponible'}`}
                accessibilityState={{ selected: luggageOccupied }}
                style={[
                  styles.seatButton,
                  luggageOccupied ? styles.luggageButtonOccupied : styles.luggageButtonAvailable,
                ]}
                onPress={onToggleLuggage}
              >
                <Ionicons name="briefcase-outline" size={20} color={COLORES.blanco} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
      {gpsError ? <Text accessibilityRole="alert" style={styles.homeGpsError}>{gpsError}</Text> : null}
      {isInService && requests.filter((item) => item.estado === 'PENDIENTE').length ? (
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

function DriverAlerts({ requests, availability, onOpenRequest, onOpenNotifications, onOpenEmergency }) {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    listRecords('notificaciones')
      .then(setNotifications)
      .catch((loadError) => setError(loadError.message || 'No se pudieron cargar las alertas.'));
  }, []);
  const pending = requests.filter((item) => item.estado === 'PENDIENTE');
  const isInService = availability === 'DISPONIBLE' || availability === 'OCUPADO';
  return (
    <Page title="Alertas" subtitle={isInService ? 'Solicitudes y avisos para el conductor' : 'Avisos para el conductor'}>
      <DemoBanner>Los avisos y solicitudes visibles en DEMO no son operaciones reales.</DemoBanner>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
      <View style={styles.alertActionRow}>
        <SecondaryButton title="Notificaciones" icon="notifications-outline" onPress={onOpenNotifications} style={styles.alertActionButton} />
        <DangerButton title="SOS" icon="alert-circle-outline" onPress={onOpenEmergency} style={styles.alertActionButton} />
      </View>
      {isInService ? (
        <>
          <Text style={styles.sectionTitle}>Solicitudes pendientes ({pending.length})</Text>
          {pending.length ? pending.map((item) => (
            <RequestCard key={item.id} request={item} onPress={() => onOpenRequest(item)} />
          )) : <EmptyState title="No hay solicitudes pendientes" description="Las nuevas solicitudes aparecerán aquí." icon="checkmark-circle-outline" />}
        </>
      ) : null}
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

function DriverProfile({ user, profile, onOpen, onLogout }) {
  const fullName = [profile?.nombre_chofer, profile?.apellido_chofer].filter(Boolean).join(' ');
  return (
    <Page title="Perfil conductor" subtitle="Información de tu cuenta">
      {DEMO_MODE ? <DemoBanner>Perfil cargado desde los datos locales de demostración.</DemoBanner> : null}
      <DataCard>
        <InfoRow label="Nombre" value={fullName || user.nombre} />
        <InfoRow label="RUT" value={profile?.rut} />
        <InfoRow label="Dirección" value={profile?.direccion} />
        <InfoRow label="Comuna" value={profile?.comuna} />
        <InfoRow label="Teléfono celular" value={profile?.fono_celular} />
        <InfoRow label="Teléfono fijo" value={profile?.fono_fijo} />
        <InfoRow label="Teléfono emergencia" value={profile?.fono_emergencia} />
        <InfoRow label="Correo" value={profile?.usuario_email || user.correo} />
        <InfoRow label="Estado" value={profile?.estado} />
      </DataCard>
      {DRIVER_LINKS.map((link) => (
        <SecondaryButton key={link.id} title={link.label} icon={`${link.icon}-outline`} onPress={() => onOpen(link.id)} />
      ))}
      <DangerButton title="Cerrar sesión" icon="log-out-outline" onPress={onLogout} />
    </Page>
  );
}

function DriverLicense({ onBack, profile }) {
  return (
    <Page title="Licencia de conducir" onBack={onBack}>
      {DEMO_MODE ? <DemoBanner>Licencia obtenida desde los datos locales de demostración.</DemoBanner> : null}
      {profile?.licencia_clase ? (
        <DataCard>
          <InfoRow label="Clase" value={profile.licencia_clase} />
          <InfoRow label="Fecha emisión" value={profile.licencia_fecha_emision} />
          <InfoRow label="Comuna emisión" value={profile.licencia_comuna} />
          <InfoRow label="Vencimiento" value={profile.licencia_fecha_vencimiento} />
          <InfoRow label="Estado" value={profile.estado} />
        </DataCard>
      ) : <EmptyState title="No hay una licencia registrada" description="Contacta a administración para completar tus datos." icon="card-outline" />}
    </Page>
  );
}

function DriverVehicle({ onBack, onReport, vehicle, route }) {
  return (
    <Page title="Vehículo asociado" onBack={onBack}>
      {DEMO_MODE ? <DemoBanner>Vehículo cargado desde los datos locales de demostración.</DemoBanner> : null}
      {vehicle ? (
        <VehicleCard title="Vehículo asociado" subtitle={`${vehicle.marca} ${vehicle.modelo}`} status={vehicle.estado}>
          <InfoRow label="Patente" value={vehicle.patente} />
          <InfoRow label="Año" value={vehicle.anio} />
          <InfoRow label="Capacidad" value={vehicle.capacidad} />
          <InfoRow label="Asientos disponibles" value={vehicle.asientos_disponibles} />
          <InfoRow label="Maletero" value={vehicle.maletero_ocupado ? 'Ocupado' : 'Disponible'} />
          <InfoRow label="Servicio" value={vehicle.en_servicio ? 'En servicio' : 'Fuera de servicio'} />
          <InfoRow label="Ruta asignada" value={route ? `${route.folio} · ${route.nombre}` : 'Sin ruta asignada'} />
        </VehicleCard>
      ) : <EmptyState title="No hay un vehículo asignado" description="Solicita a administración que asigne un vehículo a tu cuenta." icon="car-outline" />}
      {vehicle ? <SecondaryButton title="Reportar problema" icon="warning-outline" onPress={onReport} /> : null}
    </Page>
  );
}

function DriverRoute({ route: assignedRoute, onBack, gpsLocation, availability }) {
  const route = assignedRoute || (DEMO_MODE ? rutasConatacoch.find((item) => item.folio === '233003') : null);
  const routeCoordinates = getRouteCoordinates(route, 'IDA');
  const returnCoordinates = getRouteCoordinates(route, 'REGRESO');
  const gpsActive = Boolean(gpsLocation) && ['DISPONIBLE', 'OCUPADO'].includes(availability);
  return (
    <Page title="Mi recorrido" subtitle="Información registrada del recorrido" onBack={onBack}>
      {DEMO_MODE ? <DemoBanner>El trazado mostrado pertenece a los datos de demostración.</DemoBanner> : null}
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
        <InfoRow label="Nombre" value={route?.nombre} />
        <InfoRow label="Origen" value={route?.origen} />
        <InfoRow label="Destino" value={route?.destino} />
        <InfoRow label="Estado del trazado GPS" value={routeCoordinates.length || returnCoordinates.length ? 'Trazado disponible' : 'Sin trazado cargado'} />
        <Text style={styles.sectionTitle}>Ida</Text>
        {(route?.callesIda?.length ? route.callesIda : (route?.trazados || []).filter((point) => point.sentido === 'IDA').map((point) => point.calle)).length ? (route?.callesIda?.length ? route.callesIda : (route?.trazados || []).filter((point) => point.sentido === 'IDA').map((point) => point.calle)).map((street, index) => (
          <Text key={`ida-${index}`} style={styles.streetItem}>{index + 1}. {street}</Text>
        )) : <Text style={styles.muted}>Calles de ida no disponibles.</Text>}
        <Text style={styles.sectionTitle}>Regreso</Text>
        {(route?.callesRegreso?.length ? route.callesRegreso : (route?.trazados || []).filter((point) => point.sentido === 'REGRESO').map((point) => point.calle)).length ? (route?.callesRegreso?.length ? route.callesRegreso : (route?.trazados || []).filter((point) => point.sentido === 'REGRESO').map((point) => point.calle)).map((street, index) => (
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
      {DEMO_MODE ? <DemoBanner>Calificaciones cargadas desde los datos locales de demostración.</DemoBanner> : null}
      <DataCard style={styles.ratingSummary}>
        <Text style={styles.ratingValue}>{average} / 5</Text>
        <Text style={styles.stars}>{'★'.repeat(Math.round(Number(average) || 0)) || '☆☆☆☆☆'}</Text>
        <Text style={styles.muted}>{ratings.length} calificaciones</Text>
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
        <InfoRow
          label="Conexión"
          value={DEMO_MODE ? 'Modo de demostración; las coordenadas no se envían al servidor.' : 'Las ubicaciones se guardan mientras el vehículo está en servicio.'}
        />
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

function DriverEmergency({ onBack }) {
  const [confirmation, setConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const recordEmergency = async () => {
    setLoading(true);
    try {
      let coordinates = null;
      try {
        const current = await getCurrentLocation();
        coordinates = current.coords;
      } catch {
        coordinates = null;
      }
      await createRecord('emergencias', {
        latitud: coordinates?.latitude ?? null,
        longitud: coordinates?.longitude ?? null,
        observacion: 'Alerta de emergencia enviada desde la pantalla del conductor.',
      });
      setConfirmation(false);
      Alert.alert(
        DEMO_MODE ? 'Evento DEMO registrado' : 'Alerta enviada',
        DEMO_MODE
          ? 'El evento se guardó localmente; no se notificó al administrador.'
          : 'La alerta quedó registrada y se notificó al administrador.',
      );
    } catch (error) {
      Alert.alert('No se pudo registrar', error.message || 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Emergencia" subtitle="No se realizan llamadas automáticas" onBack={onBack}>
      {DEMO_MODE ? <DemoBanner>El evento solo se guarda localmente y no alerta al administrador.</DemoBanner> : null}
      <DataCard style={styles.emergencyCard}>
        <Ionicons name="alert-circle" size={54} color={COLORES.rojo} />
        <Text style={styles.sectionTitle}>Botón de pánico</Text>
        <Text style={styles.bodyText}>
          Se solicitará confirmación antes de enviar una alerta al administrador.
        </Text>
        <DangerButton
          title={loading ? 'Registrando evento...' : 'BOTÓN DE PÁNICO'}
          icon="warning"
          onPress={() => setConfirmation(true)}
        />
      </DataCard>
      <ConfirmModal
        visible={confirmation}
        title="Confirmar alerta de emergencia"
        message={DEMO_MODE
          ? 'Se guardará un evento local de prueba. No se notificará al administrador.'
          : 'Se enviará una alerta al administrador con tu ubicación GPS si está disponible.'}
        confirmLabel={DEMO_MODE ? 'Registrar DEMO' : 'Enviar alerta'}
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
    <Page title="Historial de viajes" subtitle="Viajes asociados a tu cuenta" onBack={onBack}>
      {DEMO_MODE ? <DemoBanner>Historial cargado desde los datos locales de demostración.</DemoBanner> : null}
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
      {DEMO_MODE ? <DemoBanner>Detalle de un viaje local de demostración.</DemoBanner> : null}
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
  const [driverProfile, setDriverProfile] = useState(null);
  const [loginScreen, setLoginScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('inicio');
  const [secondaryScreen, setSecondaryScreen] = useState(null);
  const [availability, setAvailability] = useState('OFFLINE');
  const [seatCapacity, setSeatCapacity] = useState(4);
  const [luggageOccupied, setLuggageOccupied] = useState(false);
  const [driverVehicle, setDriverVehicle] = useState(null);
  const [driverRoute, setDriverRoute] = useState(null);
  const [sendingSOS, setSendingSOS] = useState(false);
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
  const lastLocationUpload = useRef(0);
  const locationUploadPending = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('conductorBiometriaActiva')
      .then((value) => setSettings((current) => ({ ...current, biometric: value === 'true' })))
      .catch((storageError) => setError(storageError.message));
    return () => mapSubscription.current?.remove();
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let mounted = true;
    Promise.all([
      listRecords('solicitudes'),
      listRecords('vehiculos'),
      listRecords('viajes'),
      listRecords('conductores'),
    ])
      .then(([requestRecords, vehicles, trips, drivers]) => {
        if (!mounted) return;
        setRequests(requestRecords);
        setDriverProfile(drivers[0] || null);
        const vehicle = vehicles[0] || null;
        setDriverVehicle(vehicle);
        if (vehicle) {
          setSeatCapacity(Number(vehicle.asientos_disponibles ?? vehicle.capacidad ?? 4));
          setLuggageOccupied(Boolean(vehicle.maletero_ocupado));
          setAvailability(vehicle.en_servicio ? 'DISPONIBLE' : 'OFFLINE');
        }
        const activeTrip = trips.find((trip) => ['PROGRAMADO', 'EN_CURSO'].includes(trip.estado));
        setCurrentTrip(activeTrip || null);
        if (activeTrip) setAvailability('OCUPADO');
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'No se pudieron cargar los datos de operación.');
      });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !driverVehicle) return undefined;
    let mounted = true;
    Promise.all([listRecords('vehiculoRuta'), listRecords('rutas')])
      .then(([assignments, routes]) => {
        if (!mounted) return;
        const assignment = assignments.find((item) => String(item.vehiculo) === String(driverVehicle.id) && item.activo !== false);
        const route = assignment && routes.find((item) =>
          String(item.id) === String(assignment.ruta) ||
          String(item.folio) === String(assignment.folio)
        );
        setDriverRoute(route || null);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'No se pudo cargar la ruta asignada.');
      });
    return () => { mounted = false; };
  }, [user, driverVehicle]);

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
    watchCurrentLocation((position) => {
      if (!mounted) return;
      setGpsLocation(position);
      const now = Date.now();
      if (
        !DEMO_MODE &&
        driverVehicle &&
        ['DISPONIBLE', 'OCUPADO'].includes(availability) &&
        !locationUploadPending.current &&
        now - lastLocationUpload.current >= 30000
      ) {
        locationUploadPending.current = true;
        createRecord('ubicaciones', {
          vehiculo: driverVehicle.id,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          activo: true,
        })
          .then(() => { lastLocationUpload.current = Date.now(); })
          .catch((uploadError) => {
            if (mounted) setGpsError(`No se pudo guardar la ubicación en el servidor: ${uploadError.message}`);
          })
          .finally(() => { locationUploadPending.current = false; });
      }
    })
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
  }, [user, activeTab, secondaryScreen, availability, driverVehicle]);

  const toggleService = async () => {
    if (currentTrip) return;
    if (!driverVehicle) {
      Alert.alert('Vehículo no asignado', 'Solicita a administración que asigne un vehículo a tu cuenta.');
      return;
    }
    try {
      if (availability === 'DISPONIBLE') {
        if (gpsLocation?.coords) {
          await createRecord('ubicaciones', {
            vehiculo: driverVehicle.id,
            latitud: gpsLocation.coords.latitude,
            longitud: gpsLocation.coords.longitude,
            activo: false,
          });
        }
        const updated = await updateRecord('vehiculos', driverVehicle.id, { en_servicio: false });
        setDriverVehicle(updated);
        setAvailability('OFFLINE');
        return;
      }
      const hasLocation = await requestGPS();
      if (!hasLocation) return;
      const updated = await updateRecord('vehiculos', driverVehicle.id, { en_servicio: true });
      setDriverVehicle(updated);
      setAvailability('DISPONIBLE');
    } catch (serviceError) {
      Alert.alert('No se pudo cambiar el servicio', serviceError.message || 'Revisa tu conexión e intenta nuevamente.');
    }
  };

  const selectSeatCapacity = async (count) => {
    if (!driverVehicle) return;
    try {
      const updated = await updateRecord('vehiculos', driverVehicle.id, { asientos_disponibles: count });
      setDriverVehicle(updated);
      setSeatCapacity(Number(updated.asientos_disponibles));
    } catch (seatError) {
      Alert.alert('No se pudo actualizar', seatError.message || 'No se guardó la cantidad de asientos disponibles.');
    }
  };

  const toggleLuggage = async () => {
    if (!driverVehicle) return;
    try {
      const updated = await updateRecord('vehiculos', driverVehicle.id, {
        maletero_ocupado: !luggageOccupied,
      });
      setDriverVehicle(updated);
      setLuggageOccupied(Boolean(updated.maletero_ocupado));
    } catch (luggageError) {
      Alert.alert('No se pudo actualizar', luggageError.message || 'No se guardó el estado del maletero.');
    }
  };

  const sendSOSAlert = async () => {
    if (!user || sendingSOS) return;
    setSendingSOS(true);
    try {
      let coordinates = gpsLocation?.coords || null;
      if (!gpsLocation) {
        try {
          const current = await getCurrentLocation();
          coordinates = current.coords;
        } catch {
          coordinates = null;
        }
      }
      await createRecord('emergencias', {
        latitud: coordinates?.latitude ?? null,
        longitud: coordinates?.longitude ?? null,
        observacion: DEMO_MODE
          ? 'Alerta SOS registrada desde la pantalla del conductor (DEMO).'
          : 'Alerta SOS enviada desde la pantalla del conductor.',
      });
      const location = coordinates
        ? `${coordinates.latitude}, ${coordinates.longitude}`
        : 'GPS no disponible';
      Alert.alert(
        DEMO_MODE ? 'SOS registrado (DEMO)' : 'SOS enviado',
        DEMO_MODE
          ? `El evento se guardó localmente, pero no se notificó al administrador. Ubicación: ${location}.`
          : 'La alerta se envió al sistema.',
      );
    } catch (sosError) {
      Alert.alert('No se pudo enviar SOS', sosError.message || 'No se pudo registrar la alerta. Intenta nuevamente.');
    } finally {
      setSendingSOS(false);
    }
  };

  const logout = async () => {
    try {
      await logoutSession();
    } catch (logoutError) {
      Alert.alert('Sesión cerrada localmente', logoutError.message || 'No se pudo revocar la sesión en el servidor.');
    }
    setUser(null);
    setActiveTab('inicio');
    setSecondaryScreen(null);
    setCurrentTrip(null);
    setDriverVehicle(null);
    setDriverRoute(null);
    setDriverProfile(null);
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
        let trip;
        if (DEMO_MODE) {
          trip = await createRecord('viajes', {
            solicitud: request.id,
            pasajero: request.pasajero,
            conductor: user.nombre,
            vehiculo: driverVehicle?.id,
            ruta: request.ruta,
            asientos: request.asientos,
            puntoRecogida: request.puntoRecogida,
            estado: 'PROGRAMADO',
            inicio: new Date().toLocaleString(),
            horaInicio: '',
            horaFin: '',
            calificacion: null,
          });
        } else {
          const trips = await listRecords('viajes');
          trip = trips.find((item) => String(item.solicitud) === String(request.id));
          if (!trip) throw new Error('El servidor aceptó la solicitud, pero no devolvió el viaje asociado.');
          const vehicles = await listRecords('vehiculos');
          const updatedVehicle = vehicles.find((item) => String(item.id) === String(driverVehicle?.id));
          if (updatedVehicle) {
            setDriverVehicle(updatedVehicle);
            setSeatCapacity(Number(updatedVehicle.asientos_disponibles ?? updatedVehicle.capacidad));
          }
        }
        setCurrentTrip(trip);
        setAvailability('OCUPADO');
        setSecondaryScreen('viajeActual');
        Alert.alert('Solicitud aceptada', DEMO_MODE ? 'Se creó un viaje de demostración.' : 'El viaje quedó registrado en la base de datos.');
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
      const updated = await updateRecord('viajes', currentTrip.id, { estado: trip.estado });
      if (!DEMO_MODE && (state === 'FINALIZADO' || state === 'CANCELADO')) {
        const vehicles = await listRecords('vehiculos');
        const vehicle = vehicles.find((item) => String(item.id) === String(driverVehicle?.id));
        if (vehicle) {
          setDriverVehicle(vehicle);
          setSeatCapacity(Number(vehicle.asientos_disponibles ?? vehicle.capacidad));
        }
        if (driverVehicle) {
          const offService = await updateRecord('vehiculos', driverVehicle.id, { en_servicio: false });
          setDriverVehicle(offService);
        }
      }
      setCurrentTrip(state === 'FINALIZADO' || state === 'CANCELADO' ? null : updated);
      if (state === 'FINALIZADO' || state === 'CANCELADO') {
        setAvailability('OFFLINE');
        Alert.alert('Viaje actualizado', `Estado: ${state}${DEMO_MODE ? ' (DEMO).' : '.'}`);
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
    if (secondaryScreen === 'vehiculo') return <DriverVehicle vehicle={driverVehicle} route={driverRoute} onBack={goBack} onReport={() => Alert.alert('Reportar problema', 'Comunícate con administración para registrar problemas del vehículo.') } />;
    if (secondaryScreen === 'licencia') return <DriverLicense profile={driverProfile} onBack={goBack} />;
    if (secondaryScreen === 'gps') return <DriverGPS gpsLocation={gpsLocation} permission={gpsPermission} error={gpsError} onRequestGPS={requestGPS} loading={loadingGPS} onBack={goBack} />;
    if (secondaryScreen === 'calificaciones') return <DriverRatings onBack={goBack} />;
    if (secondaryScreen === 'notificaciones') return <DriverNotifications onBack={goBack} />;
    if (secondaryScreen === 'emergencia') return <DriverEmergency onBack={goBack} />;
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
        onEmergency={sendSOSAlert}
        sendingSOS={sendingSOS}
        gpsLocation={gpsLocation}
        currentTrip={currentTrip}
        openScreen={openScreen}
        requests={requests}
        seatCapacity={seatCapacity}
        onSelectSeatCapacity={selectSeatCapacity}
        luggageOccupied={luggageOccupied}
        onToggleLuggage={toggleLuggage}
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
          availability={availability}
          onOpenRequest={(request) => {
            setSelectedTrip({ requestId: request.id });
            setSecondaryScreen('detalleSolicitud');
          }}
          onOpenNotifications={() => openScreen('notificaciones')}
          onOpenEmergency={() => openScreen('emergencia')}
        />
      );
    }
    return <DriverProfile user={user} profile={driverProfile} onOpen={openScreen} onLogout={logout} />;
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
    paddingVertical: 8,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  driverLogo: { height: 42, maxWidth: '70%' },
  sosButton: {
    minWidth: 64,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#D71920',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  sosText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  homeCard: {
    flex: 1,
    minHeight: 0,
    marginTop: -10,
    paddingTop: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  homeStatus: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  homeStatusText: { alignItems: 'center', gap: 2 },
  homeStatusTitle: { color: '#111111', fontSize: 19, fontWeight: '900' },
  gpsStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  homeMapWrap: {
    flex: 1,
    minHeight: 130,
    marginHorizontal: 12,
    marginBottom: 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E3DF',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
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
    marginTop: 6,
  },
  seatControlLabel: { color: '#333333', fontWeight: '800', fontSize: 11, marginHorizontal: 4, marginBottom: 5 },
  seatControl: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  seatButtons: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  seatButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  seatButtonSelected: { backgroundColor: '#149E2D' },
  seatButtonUnselected: { backgroundColor: '#A7ADB4' },
  seatButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  luggageButtonAvailable: { backgroundColor: '#149E2D' },
  luggageButtonOccupied: { backgroundColor: '#D71920' },
  serviceActionWrap: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 8 },
  serviceAction: {
    minHeight: 54,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
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

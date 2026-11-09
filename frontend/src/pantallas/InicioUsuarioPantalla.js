import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_DEFAULT } from '../componentes/Mapa';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiRequest } from '../servicios/apiService';
import { createRecord, listRecords, planificarRuta, updateRecord } from '../servicios/dataService';
import { DEMO_MODE } from '../servicios/authService';
import { getCurrentLocation, requestForegroundLocationPermission, watchCurrentLocation } from '../servicios/locationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const USER_COLOR = '#149E2D';
const WALK_COLOR = '#5F6368';
// This is only the camera view used when GPS is unavailable; it is never shown as the user's location.
const MANUAL_MAP_REGION = { latitude: -33.5385, longitude: -70.6278, latitudeDelta: 0.08, longitudeDelta: 0.08 };
export default function InicioUsuarioPantalla({ usuarioActual }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const gpsActive = useRef(true);
  const locationSubscription = useRef(null);
  const searchSequence = useRef(0);
  const geocodeSequence = useRef(0);
  const geocodeController = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsMessage, setGpsMessage] = useState('');
  const [destino, setDestino] = useState(null);
  const [origenViaje, setOrigenViaje] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [rutaSugerida, setRutaSugerida] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [asientos, setAsientos] = useState(1);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  const receiveLocation = useCallback((position, center = false) => {
    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const location = { latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : null };
    setUbicacionUsuario(location);
    setGpsMessage('');
    if (center && mapRef.current) {
      mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 700);
    }
  }, []);

  const solicitarUbicacion = useCallback(async (center = true) => {
    setGpsLoading(true);
    setGpsMessage('');
    try {
      const permission = await requestForegroundLocationPermission();
      if (permission !== 'granted') {
        setGpsMessage('No hay permiso de ubicación. Puedes concederlo en los ajustes o elegir un punto manualmente.');
        return;
      }
      const position = await getCurrentLocation();
      receiveLocation(position, center);
      if (!locationSubscription.current) {
        locationSubscription.current = await watchCurrentLocation((nextPosition) => {
          if (gpsActive.current) receiveLocation(nextPosition);
        });
      }
    } catch (error) {
      setGpsMessage(error.message || 'No fue posible obtener la ubicación GPS. Puedes seguir usando el mapa manualmente.');
    } finally {
      setGpsLoading(false);
    }
  }, [receiveLocation]);

  useEffect(() => {
    gpsActive.current = true;
    solicitarUbicacion(true);
    return () => {
      gpsActive.current = false;
      locationSubscription.current?.remove();
      locationSubscription.current = null;
      geocodeController.current?.abort();
    };
  }, [solicitarUbicacion]);

  useEffect(() => {
    if (solicitudActual?.estado !== 'ACEPTADA' || !origenViaje) return undefined;
    const refreshDriver = async () => {
      try {
        const match = await apiRequest(
          `/api/rutas/match/?latitude=${encodeURIComponent(origenViaje.latitud)}&longitude=${encodeURIComponent(origenViaje.longitud)}`,
        );
        setMatchData(String(match.ruta?.id) === String(solicitudActual.ruta)
          ? match
          : { ...match, vehiculos: [] });
      } catch { /* el marcador conserva su última posición disponible */ }
    };
    const timer = setInterval(refreshDriver, 10000);
    return () => clearInterval(timer);
  }, [solicitudActual?.estado, solicitudActual?.ruta, origenViaje?.latitud, origenViaje?.longitud]);

  useEffect(() => {
    if (!solicitudActual) return undefined;
    const poll = async () => {
      try {
        const requests = await listRecords('solicitudes');
        const current = requests.find((item) => String(item.id) === String(solicitudActual.id));
        if (current) setSolicitudActual(current);
      } catch { /* se reintenta en el siguiente intervalo */ }
    };
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [solicitudActual?.id]);

  const buscarPlan = async (point, originOverride = null) => {
    const selectedOrigin = originOverride || (ubicacionUsuario
      ? { latitud: ubicacionUsuario.latitude, longitud: ubicacionUsuario.longitude }
      : null);
    if (!selectedOrigin) {
      const manualOrigin = { latitud: point.latitude, longitud: point.longitude };
      setOrigenViaje(manualOrigin);
      setDestino(null);
      setPlan(null);
      setRutaSugerida(null);
      setPlanError('Este punto quedó como origen. Ahora busca tu destino o tócalo en el mapa.');
      mapRef.current?.animateToRegion({
        latitude: point.latitude, longitude: point.longitude, latitudeDelta: 0.018, longitudeDelta: 0.018,
      }, 600);
      return;
    }
    const requestId = ++searchSequence.current;
    const origin = {
      latitud: Number(selectedOrigin.latitud ?? selectedOrigin.latitude),
      longitud: Number(selectedOrigin.longitud ?? selectedOrigin.longitude),
    };
    const destination = { latitud: point.latitude, longitud: point.longitude };
    setDestino(point);
    setOrigenViaje(origin);
    setPlan(null);
    setRutaSugerida(null);
    setMatchData(null);
    setPlanError('');
    setPlanLoading(true);
    Keyboard.dismiss();
    try {
      const result = await planificarRuta(origin, destination);
      if (requestId !== searchSequence.current) return;
      setPlan(result);
      const recommended = result.ruta_recomendada;
      setRutaSugerida(recommended?.ruta || null);
      if (!recommended) {
        setPlanError('Aún no hay una ruta dibujada para este destino. Prueba un punto cercano.');
        setPlanLoading(false);
        return;
      }
      const routeGeometryCoordinates = getRouteGeometryCoordinates(recommended?.geometry || recommended?.ruta?.geometry);
      const coordinates = [
        { latitude: origin.latitud, longitude: origin.longitud },
        { latitude: point.latitude, longitude: point.longitude },
        ...(routeGeometryCoordinates.length
          ? routeGeometryCoordinates
          : (recommended.tramo_colectivo || []).map((item) => ({ latitude: item.latitud, longitude: item.longitud }))),
      ];
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 95, right: 35, left: 35, bottom: Math.min(height * 0.58, 420) },
        animated: true,
      });
    } catch (error) {
      if (requestId === searchSequence.current) {
        setPlanError(error.message || 'No se pudo planificar el viaje.');
        setPlanLoading(false);
      }
    } finally {
      if (requestId === searchSequence.current) setPlanLoading(false);
    }
  };

  const reservar = async () => {
    const activeRoute = viaje?.ruta || rutaSugerida;
    const vehicle = String(matchData?.ruta?.id) === String(activeRoute?.id)
      ? matchData?.vehiculos?.find((item) => Number(item.asientos_disponibles) >= asientos)
      : null;
    if (!vehicle || !activeRoute || !origenViaje || enviandoSolicitud) return;
    if (DEMO_MODE) {
      Alert.alert('Modo demostración', 'Desactiva EXPO_PUBLIC_DEMO_MODE para crear solicitudes reales en PostgreSQL.');
      return;
    }
    setEnviandoSolicitud(true);
    try {
      const request = await createRecord('solicitudes', {
        vehiculo: vehicle.id,
        ruta: activeRoute.id,
        cantidad_asientos: asientos,
        latitud_recogida: origenViaje.latitud,
        longitud_recogida: origenViaje.longitud,
      });
      setSolicitudActual(request);
    } catch (error) {
      Alert.alert('No se pudo solicitar', error.message || 'Actualiza la búsqueda e intenta nuevamente.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const cancelarSolicitud = async () => {
    if (!solicitudActual) return;
    try {
      await updateRecord('solicitudes', solicitudActual.id, { estado: 'CANCELADA' });
      setSolicitudActual(null);
    } catch (error) { Alert.alert('No se pudo cancelar', error.message); }
  };

  const seleccionarDestino = (coordinate) => {
    if (!coordinate) return;
    const point = { latitude: coordinate.latitude, longitude: coordinate.longitude };
    if (!ubicacionUsuario && !origenViaje) {
      buscarPlan(point, null);
      return;
    }
    buscarPlan(point, origenViaje);
  };

  const handleBuscar = async () => {
    const query = busqueda.trim();
    if (!query) {
      setSearchMessage('Escribe una dirección o un lugar para buscar.');
      return;
    }
    geocodeController.current?.abort();
    const controller = new AbortController();
    geocodeController.current = controller;
    const requestId = ++geocodeSequence.current;
    const timeout = setTimeout(() => controller.abort(), 12000);
    Keyboard.dismiss();
    setSearchMessage('');
    setBuscando(true);
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=json&q='
        + encodeURIComponent(query + ', Santiago, Chile') + '&limit=1';
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ConatacochApp/1.0' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('No se pudo conectar con el buscador de direcciones.');
      const results = await response.json();
      if (requestId !== geocodeSequence.current) return;
      if (results?.length && Number.isFinite(Number(results[0].lat)) && Number.isFinite(Number(results[0].lon))) {
        seleccionarDestino(
          { latitude: Number(results[0].lat), longitude: Number(results[0].lon) },
        );
      } else {
        setSearchMessage('No encontramos "' + query + '". Revisa el nombre o elige el punto en el mapa.');
      }
    } catch (error) {
      if (requestId === geocodeSequence.current) {
        setSearchMessage(controller.signal.aborted
          ? 'La búsqueda tardó demasiado. Comprueba tu conexión y vuelve a intentarlo.'
          : (error.message || 'No se pudo buscar esa dirección. Comprueba tu conexión.'));
      }
    } finally {
      clearTimeout(timeout);
      if (requestId === geocodeSequence.current) setBuscando(false);
    }
  };

  const limpiarBusqueda = () => {
    searchSequence.current += 1;
    geocodeSequence.current += 1;
    geocodeController.current?.abort();
    setBusqueda('');
    setBuscando(false);
    setSearchMessage('');
    setDestino(null);
    setPlan(null);
    setOrigenViaje(null);
    setRutaSugerida(null);
    setMatchData(null);
    setPlanError('');
    setPlanLoading(false);
    if (ubicacionUsuario) {
      mapRef.current?.animateToRegion({
        latitude: ubicacionUsuario.latitude,
        longitude: ubicacionUsuario.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 600);
    }
  };

  const getRouteGeometryCoordinates = (geometry) => {
    if (!geometry || typeof geometry !== 'object') return [];
    if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates
        .map((coord) => (Array.isArray(coord) && coord.length >= 2
          ? { latitude: Number(coord[1]), longitude: Number(coord[0]) }
          : null))
        .filter(Boolean);
    }
    if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates.flatMap((segment) => (
        segment
          .map((coord) => (Array.isArray(coord) && coord.length >= 2
            ? { latitude: Number(coord[1]), longitude: Number(coord[0]) }
            : null))
          .filter(Boolean)
      ));
    }
    return [];
  };

  const viaje = plan?.ruta_recomendada || null;
  const activeRoute = viaje?.ruta || rutaSugerida;
  const vehicle = String(matchData?.ruta?.id) === String(activeRoute?.id)
    ? matchData?.vehiculos?.find((item) => Number(item.asientos_disponibles) >= asientos)
    : null;
  const assignedVehicle = solicitudActual?.estado === 'ACEPTADA'
    ? matchData?.vehiculos?.find((item) => String(item.id) === String(solicitudActual.vehiculo) &&
      String(matchData?.ruta?.id) === String(activeRoute?.id))
    : null;
  const userCoordinate = ubicacionUsuario
    ? { latitude: ubicacionUsuario.latitude, longitude: ubicacionUsuario.longitude }
    : null;
  const tripOriginCoordinate = origenViaje
    ? { latitude: origenViaje.latitud, longitude: origenViaje.longitud }
    : null;
  const movedFromTripOrigin = userCoordinate && tripOriginCoordinate && (
    Math.abs(userCoordinate.latitude - tripOriginCoordinate.latitude) > 0.00015 ||
    Math.abs(userCoordinate.longitude - tripOriginCoordinate.longitude) > 0.00015
  );
  const walkingStart = viaje?.subida
    ? { latitude: viaje.subida.latitud, longitude: viaje.subida.longitud }
    : null;
  const walkingEnd = viaje?.bajada
    ? { latitude: viaje.bajada.latitud, longitude: viaje.bajada.longitud }
    : null;
  const routeGeometryCoordinates = getRouteGeometryCoordinates(viaje?.geometry || viaje?.ruta?.geometry);
  const transitCoordinates = (routeGeometryCoordinates.length
    ? routeGeometryCoordinates
    : (viaje?.tramo_colectivo || []).map((point) => ({ latitude: point.latitud, longitude: point.longitud }))
  );
  const resultPanelBottom = 78 + Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12);
  const resultPanelMaxHeight = Math.max(
    80,
    Math.min(height * 0.52, 460, height - (Platform.OS === 'ios' ? 100 : 84) - resultPanelBottom - 12),
  );
  const noticeMessage = searchMessage || (!destino
    ? (gpsMessage || (!ubicacionUsuario && origenViaje
      ? planError || 'Origen manual seleccionado. Ahora busca tu destino.'
      : ''))
    : '');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.045 }]}>
        <Image source={require('../../assets/logoLPng.png')} style={[styles.logoImage, { width: Math.min(width * 0.62, 220) }]} resizeMode="contain" />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={userCoordinate ? { ...userCoordinate, latitudeDelta: 0.03, longitudeDelta: 0.03 } : MANUAL_MAP_REGION}
          showsCompass={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onPress={(event) => seleccionarDestino(event?.nativeEvent?.coordinate)}
          mapType="standard"
        >
          {viaje && tripOriginCoordinate && walkingStart ? (
            <Polyline coordinates={[tripOriginCoordinate, walkingStart]} strokeColor={WALK_COLOR} strokeWidth={4} lineDashPattern={[3, 7]} />
          ) : null}
          {transitCoordinates.length > 1 ? <Polyline coordinates={transitCoordinates} strokeColor="#FFFFFF" strokeWidth={12} lineCap="round" lineJoin="round" /> : null}
          {transitCoordinates.length > 1 ? (
            <Polyline coordinates={transitCoordinates} strokeColor={viaje.ruta.color_hex || USER_COLOR} strokeWidth={7} lineCap="round" lineJoin="round" />
          ) : null}
          {viaje && destino && walkingEnd ? (
            <Polyline coordinates={[walkingEnd, destino]} strokeColor={WALK_COLOR} strokeWidth={4} lineDashPattern={[3, 7]} />
          ) : null}
          {ubicacionUsuario?.accuracy > 0 ? (
            <Circle
              center={userCoordinate}
              radius={ubicacionUsuario.accuracy}
              strokeColor="rgba(20,158,45,0.45)"
              strokeWidth={1}
              fillColor="rgba(20,158,45,0.14)"
            />
          ) : null}
          {userCoordinate ? (
            <Marker coordinate={userCoordinate} title="Tu ubicación actual" anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.userHalo}><View style={styles.userDot} /></View>
            </Marker>
          ) : null}
          {!ubicacionUsuario && tripOriginCoordinate ? (
            <Marker coordinate={tripOriginCoordinate} title="Origen manual" pinColor="#5F6368" />
          ) : movedFromTripOrigin ? (
            <Marker coordinate={tripOriginCoordinate} title="Origen usado para este cálculo" pinColor="#5F6368" />
          ) : null}
          {destino ? <Marker coordinate={destino} title="Destino" pinColor="#C62828" /> : null}
          {viaje && walkingStart ? <Marker coordinate={walkingStart} title={`Subida · ${viaje.subida.calle || 'colectivo'}`} pinColor="#1565C0" /> : null}
          {viaje && walkingEnd ? <Marker coordinate={walkingEnd} title={`Bajada · ${viaje.bajada.calle || 'colectivo'}`} pinColor="#EF6C00" /> : null}
          {assignedVehicle?.latitud != null && assignedVehicle?.longitud != null ? (
            <Marker
              coordinate={{ latitude: Number(assignedVehicle.latitud), longitude: Number(assignedVehicle.longitud) }}
              title="Conductor asignado"
              description={assignedVehicle.conductor_nombre || ''}
              pinColor="#6A1B9A"
            />
          ) : null}
        </MapView>

        <View style={[styles.searchBar, { left: width * 0.04, right: width * 0.04 }]}>
          <Ionicons name="search-outline" size={22} color="#555555" />
          <TextInput
            style={styles.searchInput}
            placeholder="¿A dónde quieres ir?"
            placeholderTextColor="#666666"
            value={busqueda}
            onChangeText={(value) => { setBusqueda(value); setSearchMessage(''); }}
            onSubmitEditing={handleBuscar}
            returnKeyType="search"
            accessibilityLabel="Dirección de destino"
          />
          {(busqueda || destino) ? (
            <TouchableOpacity style={styles.searchAction} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda y ruta" onPress={limpiarBusqueda}>
              <Ionicons name="close-circle" size={25} color="#666666" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.searchAction}
            accessibilityRole="button"
            accessibilityLabel="Buscar dirección"
            onPress={handleBuscar}
            disabled={buscando || !busqueda.trim()}
          >
            {buscando || planLoading
              ? <ActivityIndicator size="small" color={USER_COLOR} />
              : <Ionicons name="arrow-forward-circle" size={28} color={busqueda.trim() ? USER_COLOR : '#888888'} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación GPS"
          style={[styles.gpsButton, { right: width * 0.04 }]}
          onPress={() => solicitarUbicacion(true)}
        >
          {gpsLoading
            ? <ActivityIndicator size="small" color={USER_COLOR} />
            : <MaterialCommunityIcons name="crosshairs-gps" size={24} color={USER_COLOR} />}
        </TouchableOpacity>

        {noticeMessage ? (
          <View style={[styles.gpsNotice, { left: width * 0.04, right: width * 0.04 }]}>
            <Text accessibilityRole="alert" style={styles.gpsNoticeText}>{noticeMessage}</Text>
          </View>
        ) : null}

        {destino ? (
          <View style={[styles.tripCard, {
            left: width * 0.035, right: width * 0.035,
            bottom: resultPanelBottom,
            maxHeight: resultPanelMaxHeight,
          }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTag}>
                {planLoading ? 'Calculando ruta...' : viaje ? 'Ruta recomendada' : 'Ruta no disponible'}
              </Text>
              <TouchableOpacity style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Cerrar resultados" onPress={limpiarBusqueda}>
                <Ionicons name="close-circle" size={26} color="#555555" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tripContent} contentContainerStyle={styles.tripContentInner} keyboardShouldPersistTaps="handled">
              {planLoading ? <View style={styles.loadingRow}><ActivityIndicator color={USER_COLOR} /><Text style={styles.bodyText}>Calculando el recorrido...</Text></View> : null}
              {planError ? <Text accessibilityRole="alert" style={styles.errorText}>{planError}</Text> : null}
            {viaje ? (
              <>
                <Text style={styles.routeTitle}>Ruta {viaje.ruta.folio}</Text>
                <Text style={styles.bodyText}>{viaje.ruta.nombre} · {viaje.sentido === 'IDA' ? 'Ida' : 'Regreso'} · {viaje.tipo_trazado === 'ALTERNATIVO' ? 'Alternativa' : 'Principal'}</Text>
                <View style={styles.steps}>
                  <Text style={styles.stepText}>Camina {viaje.caminar_origen_metros} m hasta {viaje.subida.calle || 'el punto de subida'}</Text>
                  <Text style={[styles.stepText, { color: viaje.ruta.color_hex, fontWeight: '800' }]}>Toma el colectivo · {viaje.distancia_colectivo_metros} m</Text>
                  <Text style={styles.stepText}>Baja en {viaje.bajada.calle || 'el punto indicado'} y camina {viaje.caminar_destino_metros} m</Text>
                </View>
                <Text style={styles.totalTime}>{viaje.minutos_totales_estimados} min aprox.</Text>
              </>
            ) : null}
            {vehicle && !solicitudActual ? (
              <View style={styles.vehicleSection}>
                <Text style={styles.bodyText}>Hay un vehículo disponible en esta ruta · {vehicle.asientos_disponibles} cupos</Text>
                <View style={styles.seatSelector}>
                  {[1, 2, 3, 4].map((count) => (
                    <TouchableOpacity key={count} onPress={() => setAsientos(count)} style={[styles.seatOption, asientos === count && styles.seatOptionActive]}>
                      <Text style={[styles.seatOptionText, asientos === count && styles.seatOptionTextActive]}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity disabled={enviandoSolicitud} style={[styles.reserveButton, enviandoSolicitud && styles.disabledButton]} onPress={reservar}>
                  <Text style={styles.reserveButtonText}>{enviandoSolicitud ? 'Enviando...' : 'Reservar colectivo'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {solicitudActual ? (
              <View style={styles.vehicleSection}>
                <Text style={styles.bodyText}>Solicitud {solicitudActual.estado?.toLowerCase()} · Ruta {solicitudActual.ruta_folio || rutaSugerida?.folio}</Text>
                {solicitudActual.estado === 'ACEPTADA' && assignedVehicle ? <Text style={styles.bodyText}>Conductor {assignedVehicle.conductor_nombre || 'asignado'} · ubicación marcada en el mapa</Text> : null}
                {solicitudActual.estado === 'PENDIENTE' ? <TouchableOpacity onPress={cancelarSolicitud}><Text style={styles.cancelText}>Cancelar solicitud</Text></TouchableOpacity> : null}
              </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 10, alignItems: 'center' },
  logoImage: { height: 42, maxWidth: '100%' },
  mapContainer: { flex: 1, backgroundColor: '#E5E3DF' },
  map: { width: '100%', height: '100%' },
  searchBar: { position: 'absolute', top: 14, height: 58, backgroundColor: '#FFFFFF', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, elevation: 6, shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 5 },
  searchInput: { flex: 1, minWidth: 0, height: '100%', fontSize: 17, color: '#111111', marginLeft: 8 },
  searchAction: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  gpsButton: { position: 'absolute', top: 84, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  userHalo: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(20,158,45,0.24)', borderColor: '#FFFFFF', borderWidth: 2, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  userDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: USER_COLOR, borderColor: '#FFFFFF', borderWidth: 1 },
  gpsNotice: { position: 'absolute', top: 144, padding: 13, backgroundColor: '#FFFFFF', borderRadius: 12, elevation: 3 },
  gpsNoticeText: { color: '#333333', fontSize: 15, lineHeight: 21 },
  tripCard: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 15, elevation: 8, shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tripContent: { flexShrink: 1 },
  tripContentInner: { paddingBottom: 8 },
  cardTag: { flex: 1, fontSize: 14, fontWeight: '800', color: USER_COLOR, textTransform: 'uppercase' },
  routeTitle: { fontSize: 21, fontWeight: '900', color: '#111111' },
  bodyText: { color: '#444444', fontSize: 15, lineHeight: 22, marginTop: 5 },
  steps: { borderLeftWidth: 3, borderLeftColor: '#D9E5DA', paddingLeft: 12, marginTop: 10, gap: 7 },
  stepText: { color: '#333333', fontSize: 15, lineHeight: 21 },
  totalTime: { color: '#111111', fontSize: 20, fontWeight: '900', marginTop: 10 },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10 },
  errorText: { color: '#8A2E10', fontSize: 14, lineHeight: 20, marginVertical: 7 },
  vehicleSection: { borderTopWidth: 1, borderTopColor: '#EEEEEE', marginTop: 10, paddingTop: 8 },
  seatSelector: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
  seatOption: { minWidth: 46, height: 46, borderRadius: 23, backgroundColor: '#F0F2F0', alignItems: 'center', justifyContent: 'center' },
  seatOptionActive: { backgroundColor: USER_COLOR },
  seatOptionText: { color: '#333333', fontWeight: '800' },
  seatOptionTextActive: { color: '#FFFFFF' },
  reserveButton: { backgroundColor: USER_COLOR, borderRadius: 12, minHeight: 50, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  reserveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
  cancelText: { color: '#555555', fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 },
});

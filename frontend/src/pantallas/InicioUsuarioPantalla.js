import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator,
  useWindowDimensions, Platform, Alert, Keyboard, Image
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from '../componentes/Mapa';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiRequest } from '../servicios/apiService';
import { createRecord, listRecords, updateRecord } from '../servicios/dataService';
import { DEMO_MODE } from '../servicios/authService';
import { getCurrentLocation, requestForegroundLocationPermission } from '../servicios/locationService';

export default function InicioUsuarioPantalla({ usuarioActual }) {
  const { width } = useWindowDimensions();
  const mapRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [rutaSugerida, setRutaSugerida] = useState(null);
  const [distanciaAprox, setDistanciaAprox] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [estadoMatch, setEstadoMatch] = useState('BUSCANDO_UBICACION');
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [asientos, setAsientos] = useState(1);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  const COLORES = { verde: '#149E2D', blanco: '#FFFFFF', negro: '#000000' };
  const REGION_LA_GRANJA = { latitude: -33.5385, longitude: -70.6278, latitudeDelta: 0.035, longitudeDelta: 0.035 };

  const buscarRutaMasCercana = async (latitude, longitude) => {
    setPuntoSeleccionado({ latitude, longitude });
    setEstadoMatch('BUSCANDO_RUTA');
    setErrorUbicacion('');
    try {
      const result = await apiRequest(`/api/rutas/match/?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`);
      setMatchData(result);
      setRutaSugerida(result.ruta || null);
      setDistanciaAprox(result.distancia_metros);
      setEstadoMatch(!result.ruta ? 'SIN_RUTA' : result.vehiculos?.length ? 'ENCONTRADO' : 'SIN_VEHICULOS');
      if (mapRef.current) mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 800);
    } catch (error) {
      setMatchData(null);
      setRutaSugerida(null);
      setEstadoMatch('ERROR');
      setErrorUbicacion(error.message || 'No se pudo buscar la ruta en el servidor.');
    }
  };

  const solicitarUbicacion = async () => {
    setEstadoMatch('BUSCANDO_UBICACION');
    setErrorUbicacion('');
    try {
      const permission = await requestForegroundLocationPermission();
      if (permission !== 'granted') {
        setEstadoMatch('SIN_GPS');
        setErrorUbicacion('Necesitamos tu ubicación para encontrar el colectivo más cercano. Puedes intentar nuevamente o seleccionar un punto en el mapa.');
        return;
      }
      const position = await getCurrentLocation();
      await buscarRutaMasCercana(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      setEstadoMatch('SIN_GPS');
      setErrorUbicacion(error.message || 'No fue posible obtener tu ubicación. Selecciona un punto en el mapa.');
    }
  };

  useEffect(() => { solicitarUbicacion(); }, []);

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

  const reservar = async () => {
    const vehicle = matchData?.vehiculos?.[0];
    if (!vehicle || !rutaSugerida || !puntoSeleccionado || enviandoSolicitud) return;
    if (DEMO_MODE) {
      Alert.alert('Modo demostración', 'Desactiva EXPO_PUBLIC_DEMO_MODE para crear solicitudes reales en PostgreSQL.');
      return;
    }
    if (asientos > Number(vehicle.asientos_disponibles)) {
      Alert.alert('Cupos insuficientes', 'El vehículo no tiene suficientes cupos disponibles.');
      return;
    }
    setEnviandoSolicitud(true);
    try {
      const request = await createRecord('solicitudes', {
        vehiculo: vehicle.id,
        ruta: rutaSugerida.id,
        cantidad_asientos: asientos,
        latitud_recogida: puntoSeleccionado.latitude,
        longitud_recogida: puntoSeleccionado.longitude,
      });
      setSolicitudActual(request);
      setEstadoMatch('SOLICITUD_ENVIADA');
    } catch (error) {
      Alert.alert('No se pudo solicitar', error.message || 'Actualiza la búsqueda e intenta nuevamente.');
      if (/cupo|disponible|actualizada/i.test(error.message || '')) buscarRutaMasCercana(puntoSeleccionado.latitude, puntoSeleccionado.longitude);
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const cancelarSolicitud = async () => {
    if (!solicitudActual) return;
    try {
      await updateRecord('solicitudes', solicitudActual.id, { estado: 'CANCELADA' });
      setSolicitudActual(null);
      setEstadoMatch(matchData?.vehiculos?.length ? 'ENCONTRADO' : 'SIN_VEHICULOS');
    } catch (error) { Alert.alert('No se pudo cancelar', error.message); }
  };

  const handleMapPress = (e) => buscarRutaMasCercana(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude);

  const handleBuscar = async () => {
    if (!busqueda.trim()) { limpiarBusqueda(); return; }
    Keyboard.dismiss(); setBuscando(true);
    const texto = busqueda.trim();
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto + ', Santiago, Chile')}&limit=1`, { headers: { 'User-Agent': 'ConatacochApp/1.0' }});
      const data = await response.json();
      if (data && data.length > 0) buscarRutaMasCercana(parseFloat(data[0].lat), parseFloat(data[0].lon));
      else Alert.alert('No encontrado', `No pudimos ubicar "${texto}". Intenta tocar el mapa.`);
    } catch (error) {
      Alert.alert('Error', 'Problema de conexión al buscar.');
    } finally {
      setBuscando(false);
    }
  };

  const limpiarBusqueda = () => {
    setBusqueda(''); setPuntoSeleccionado(null); setRutaSugerida(null); setMatchData(null); setDistanciaAprox(null);
    setEstadoMatch('SIN_GPS');
    setErrorUbicacion('Busca una dirección o toca el mapa para elegir el punto de recogida.');
    if (mapRef.current) mapRef.current.animateToRegion(REGION_LA_GRANJA, 800);
  };

  const puntosIda = (rutaSugerida?.trazados || []).filter((p) => p.sentido === 'IDA').sort((a, b) => a.orden - b.orden)
    .map((p) => ({ latitude: Number(p.latitud), longitude: Number(p.longitud) }));
  const puntosRegreso = (rutaSugerida?.trazados || []).filter((p) => p.sentido === 'REGRESO').sort((a, b) => a.orden - b.orden)
    .map((p) => ({ latitude: Number(p.latitud), longitude: Number(p.longitud) }));
  const vehicle = matchData?.vehiculos?.find((item) => Number(item.asientos_disponibles) >= asientos) || matchData?.vehiculos?.[0];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.045 }]}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/logoLPng.png')}
            style={[styles.logoImage, { width: Math.min(width * 0.62, 220) }]}
            resizeMode="contain"
          />
        </View>
      </View>

      {usuarioActual ? (
        <Text style={styles.welcomeLabel}>Hola, {usuarioActual.nombre_usuario || usuarioActual.nombre || 'pasajero'}</Text>
      ) : null}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef} provider={PROVIDER_DEFAULT} style={styles.map}
          initialRegion={REGION_LA_GRANJA} showsCompass={false} showsUserLocation={false} showsMyLocationButton={false}
          onPress={handleMapPress} mapType="standard"
        >
          {puntosIda.length > 1 && <Polyline coordinates={puntosIda} strokeColor={rutaSugerida.color || COLORES.verde} strokeWidth={6} lineCap="round" lineJoin="round" />}
          {puntosRegreso.length > 1 && <Polyline coordinates={puntosRegreso} strokeColor={rutaSugerida.color || COLORES.verde} strokeWidth={5} lineDashPattern={[6, 6]} lineCap="round" lineJoin="round" />}
          {puntoSeleccionado && <Marker coordinate={puntoSeleccionado}><View style={styles.userPin}><Ionicons name="location" size={36} color="#D81B60" /></View></Marker>}
          {(matchData?.vehiculos || []).map((item) => <Marker key={item.id} coordinate={{ latitude: item.latitud, longitude: item.longitud }} title={`${item.marca} ${item.modelo}`} description={`${item.distancia_metros} m`}><View style={styles.vehiclePin}><MaterialCommunityIcons name="taxi" size={22} color="#FFFFFF" /></View></Marker>)}
        </MapView>

        <View style={[styles.searchBar, { left: width * 0.04, right: width * 0.04 }]}>
          <Ionicons name="search-outline" size={20} color="#777777" />
          <TextInput style={styles.searchInput} placeholder="Busca un lugar o toca el mapa..." placeholderTextColor="#888888" value={busqueda} onChangeText={setBusqueda} onSubmitEditing={handleBuscar} returnKeyType="search" />
          {buscando ? <ActivityIndicator size="small" color={COLORES.verde} /> : rutaSugerida ? <TouchableOpacity onPress={limpiarBusqueda}><Ionicons name="close-circle" size={22} color="#888888" /></TouchableOpacity> : <TouchableOpacity onPress={handleBuscar}><Ionicons name="arrow-forward" size={20} color={COLORES.verde} /></TouchableOpacity>}
        </View>

        <TouchableOpacity style={[styles.gpsButton, { right: width * 0.04, bottom: rutaSugerida ? 350 : 145 }]} onPress={solicitarUbicacion}>
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORES.negro} />
        </TouchableOpacity>

        <View style={[styles.cardReserva, { left: width * 0.035, right: width * 0.035 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTag}>{solicitudActual?.estado === 'ACEPTADA' ? 'Solicitud aceptada' : solicitudActual?.estado === 'RECHAZADA' ? 'Solicitud rechazada' : vehicle ? 'Colectivo más cercano' : 'Tu búsqueda'}</Text>
            {rutaSugerida ? <TouchableOpacity onPress={limpiarBusqueda}><Ionicons name="close-circle" size={24} color="#999999" /></TouchableOpacity> : null}
          </View>
          {estadoMatch === 'BUSCANDO_UBICACION' || estadoMatch === 'BUSCANDO_RUTA' ? <View style={styles.matchMessage}><ActivityIndicator color={COLORES.verde} /><Text>Buscando ruta y colectivos...</Text></View> : null}
          {errorUbicacion ? <Text style={styles.distanciaText}>{errorUbicacion}</Text> : null}
          {rutaSugerida ? <>
            <Text style={styles.folioText}>Línea {rutaSugerida.folio}</Text>
            <Text style={styles.distanciaText}>{rutaSugerida.nombre} · {rutaSugerida.origen} ↔ {rutaSugerida.destino}</Text>
            <Text style={styles.distanciaText}>Ruta a {distanciaAprox} m de tu ubicación</Text>
          </> : null}
          {rutaSugerida && !vehicle && estadoMatch === 'SIN_VEHICULOS' ? <Text style={styles.emptyMessage}>Encontramos tu ruta, pero por el momento no hay colectivos con GPS activo.</Text> : null}
          {!rutaSugerida && estadoMatch === 'SIN_RUTA' ? <Text style={styles.emptyMessage}>No encontramos una ruta CONATACOCH cercana. Toca el mapa para elegir otro punto.</Text> : null}
          {vehicle && !solicitudActual ? <>
            <View style={styles.vehicleDetails}>
              {(matchData?.vehiculos?.length || 0) > 1 ? <Text style={styles.distanciaText}>{matchData.vehiculos.length} colectivos activos · mostrando el más cercano con {asientos} cupo(s)</Text> : null}
              <Text style={styles.folioText}>{vehicle.eta_minutos} min aprox. · {vehicle.distancia_metros} m</Text>
              <Text style={styles.distanciaText}>{vehicle.conductor_nombre || 'Conductor CONATACOCH'}</Text>
              <Text style={styles.distanciaText}>{vehicle.marca} {vehicle.modelo} · {vehicle.patente}</Text>
              <Text style={styles.distanciaText}>{vehicle.asientos_disponibles} cupos disponibles</Text>
              {matchData?.tarifa_referencial_clp != null ? <Text style={styles.distanciaText}>Tarifa referencial · ${Number(matchData.tarifa_referencial_clp).toLocaleString('es-CL')} CLP</Text> : <Text style={styles.distanciaText}>Tarifa referencial no informada</Text>}
            </View>
            <Text style={styles.seatLabel}>Asientos que necesitas</Text>
            <View style={styles.seatSelector}>{[1, 2, 3, 4].map((count) => <TouchableOpacity key={count} onPress={() => setAsientos(count)} style={[styles.seatOption, asientos === count && styles.seatOptionActive]}><Text style={[styles.seatOptionText, asientos === count && styles.seatOptionTextActive]}>{count}</Text></TouchableOpacity>)}</View>
            {asientos > Number(vehicle.asientos_disponibles) ? <Text style={styles.seatError}>El vehículo no tiene suficientes cupos disponibles.</Text> : null}
            <TouchableOpacity disabled={enviandoSolicitud || asientos > Number(vehicle.asientos_disponibles)} style={[styles.btnSolicitar, (enviandoSolicitud || asientos > Number(vehicle.asientos_disponibles)) && styles.disabledButton]} onPress={reservar}><Text style={styles.btnSolicitarText}>{enviandoSolicitud ? 'Enviando...' : 'Reservar colectivo'}</Text></TouchableOpacity>
          </> : null}
          {solicitudActual ? <>
            <Text style={styles.distanciaText}>Ruta {solicitudActual.ruta_folio || rutaSugerida?.folio} · {solicitudActual.asientos || solicitudActual.cantidad_asientos} asiento(s)</Text>
            {solicitudActual.estado === 'PENDIENTE' ? <><Text style={styles.pendingMessage}>Esperando respuesta del conductor...</Text><TouchableOpacity style={styles.cancelButton} onPress={cancelarSolicitud}><Text style={styles.cancelText}>Cancelar solicitud</Text></TouchableOpacity></> : null}
            {solicitudActual.estado === 'ACEPTADA' ? <Text style={styles.acceptedMessage}>¡Tu colectivo viene en camino! {vehicle?.conductor_nombre || ''} · {vehicle?.marca} {vehicle?.modelo} · {vehicle?.patente}</Text> : null}
            {solicitudActual.estado === 'RECHAZADA' ? <><Text style={styles.seatError}>El conductor no pudo aceptar esta solicitud.</Text><TouchableOpacity style={styles.cancelButton} onPress={() => { setSolicitudActual(null); buscarRutaMasCercana(puntoSeleccionado.latitude, puntoSeleccionado.longitude); }}><Text style={styles.cancelText}>Buscar otro colectivo</Text></TouchableOpacity></> : null}
          </> : null}
          {estadoMatch === 'SIN_GPS' || estadoMatch === 'ERROR' ? <TouchableOpacity style={styles.retryButton} onPress={solicitarUbicacion}><Text style={styles.retryText}>Intentar nuevamente</Text></TouchableOpacity> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { height: 45, maxWidth: '100%' },
  welcomeLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 6 },
  mapContainer: { flex: 1, backgroundColor: '#E5E3DF' },
  map: { width: '100%', height: '100%' },
  userPin: { alignItems: 'center', justifyContent: 'center' },
  vehiclePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#149E2D', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  searchBar: { position: 'absolute', top: 14, height: 50, backgroundColor: '#FFFFFF', borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, elevation: 6 },
  searchInput: { flex: 1, height: '100%', fontSize: 13, color: '#000000', marginLeft: 8 },
  gpsButton: { position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  cardReserva: { position: 'absolute', bottom: 80, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, elevation: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTag: { fontSize: 12, fontWeight: '700', color: '#149E2D', textTransform: 'uppercase' },
  folioText: { fontSize: 20, fontWeight: '800', color: '#000000' },
  distanciaText: { fontSize: 14, color: '#555555', marginTop: 2 },
  btnSolicitar: { backgroundColor: '#149E2D', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnSolicitarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  matchMessage: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7 },
  emptyMessage: { color: '#555555', fontSize: 13, lineHeight: 19, marginVertical: 8 },
  vehicleDetails: { borderTopWidth: 1, borderTopColor: '#EEEEEE', marginTop: 8, paddingTop: 8, gap: 3 },
  seatLabel: { color: '#333333', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  seatSelector: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  seatOption: { width: 38, height: 34, borderRadius: 17, backgroundColor: '#F0F2F0', alignItems: 'center', justifyContent: 'center' },
  seatOptionActive: { backgroundColor: '#149E2D' },
  seatOptionText: { color: '#333333', fontWeight: '800' },
  seatOptionTextActive: { color: '#FFFFFF' },
  seatError: { color: '#B00020', fontSize: 12, marginBottom: 7 },
  disabledButton: { opacity: 0.55 },
  pendingMessage: { color: '#8A5B00', fontWeight: '700', marginTop: 8 },
  acceptedMessage: { color: '#149E2D', fontWeight: '800', lineHeight: 20, marginVertical: 8 },
  cancelButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#555555', fontWeight: '700', textDecorationLine: 'underline' },
  retryButton: { padding: 10, alignItems: 'center' },
  retryText: { color: '#149E2D', fontWeight: '800' },
});

import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator,
  useWindowDimensions, Platform, FlatList, Alert, Keyboard, Image
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { rutasConatacoch } from './rutasConatacoch';

export default function InicioUsuarioPantalla() {
  const { width } = useWindowDimensions();
  const mapRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [rutaSugerida, setRutaSugerida] = useState(null);
  const [distanciaAprox, setDistanciaAprox] = useState(null);

  const COLORES = { verde: '#149E2D', blanco: '#FFFFFF', negro: '#000000' };
  const REGION_LA_GRANJA = { latitude: -33.5385, longitude: -70.6278, latitudeDelta: 0.035, longitudeDelta: 0.035 };

  const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const buscarRutaMasCercana = (latitude, longitude) => {
    let mejorRuta = null;
    let menorDistancia = Infinity;
    rutasConatacoch.forEach((ruta) => {
      const todosLosPuntos = [...(ruta.coordenadasIda || []), ...(ruta.coordenadasRegreso || [])];
      todosLosPuntos.forEach((punto) => {
        const d = calcularDistanciaMetros(latitude, longitude, punto.latitude, punto.longitude);
        if (d < menorDistancia) { menorDistancia = d; mejorRuta = ruta; }
      });
    });
    if (mejorRuta && menorDistancia !== Infinity) {
      setPuntoSeleccionado({ latitude, longitude });
      setRutaSugerida(mejorRuta);
      setDistanciaAprox(Math.round(menorDistancia));
      if (mapRef.current) {
        mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 800);
      }
    }
  };

  const handleMapPress = (e) => buscarRutaMasCercana(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude);

  const handleBuscar = async () => {
    if (!busqueda.trim()) { limpiarBusqueda(); return; }
    Keyboard.dismiss(); setBuscando(true);
    const texto = busqueda.trim();
    const rutaPorFolio = rutasConatacoch.find((r) => String(r.folio) === texto);
    
    if (rutaPorFolio && rutaPorFolio.coordenadasIda?.length > 0) {
      seleccionarRutaDirecta(rutaPorFolio);
      setBuscando(false);
      return;
    }

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

  const seleccionarRutaDirecta = (ruta) => {
    setRutaSugerida(ruta); setPuntoSeleccionado(null); setDistanciaAprox(null); setBusqueda('');
    if (mapRef.current && ruta.coordenadasIda?.length > 0) {
      mapRef.current.fitToCoordinates(ruta.coordenadasIda, { edgePadding: { top: 120, right: 60, bottom: 280, left: 60 }, animated: true });
    }
  };

  const limpiarBusqueda = () => {
    setBusqueda(''); setPuntoSeleccionado(null); setRutaSugerida(null);
    if (mapRef.current) mapRef.current.animateToRegion(REGION_LA_GRANJA, 800);
  };

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

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef} provider={PROVIDER_DEFAULT} style={styles.map}
          initialRegion={REGION_LA_GRANJA} showsCompass={false} showsUserLocation={false} showsMyLocationButton={false}
          onPress={handleMapPress} mapType="standard"
        >
          {rutaSugerida?.coordenadasIda?.length > 0 && <Polyline coordinates={rutaSugerida.coordenadasIda} strokeColor={rutaSugerida.color || COLORES.verde} strokeWidth={6} lineCap="round" lineJoin="round" />}
          {rutaSugerida?.coordenadasRegreso?.length > 0 && <Polyline coordinates={rutaSugerida.coordenadasRegreso} strokeColor={rutaSugerida.color || COLORES.verde} strokeWidth={5} lineDashPattern={[6, 6]} lineCap="round" lineJoin="round" />}
          {puntoSeleccionado && <Marker coordinate={puntoSeleccionado}><View style={styles.userPin}><Ionicons name="location" size={36} color="#D81B60" /></View></Marker>}
        </MapView>

        <View style={[styles.searchBar, { left: width * 0.04, right: width * 0.04 }]}>
          <Ionicons name="search-outline" size={20} color="#777777" />
          <TextInput style={styles.searchInput} placeholder="Busca un lugar o toca el mapa..." placeholderTextColor="#888888" value={busqueda} onChangeText={setBusqueda} onSubmitEditing={handleBuscar} returnKeyType="search" />
          {buscando ? <ActivityIndicator size="small" color={COLORES.verde} /> : rutaSugerida ? <TouchableOpacity onPress={limpiarBusqueda}><Ionicons name="close-circle" size={22} color="#888888" /></TouchableOpacity> : <TouchableOpacity onPress={handleBuscar}><Ionicons name="arrow-forward" size={20} color={COLORES.verde} /></TouchableOpacity>}
        </View>

        <TouchableOpacity style={[styles.gpsButton, { right: width * 0.04, bottom: rutaSugerida ? 220 : 150 }]} onPress={() => mapRef.current?.animateToRegion(REGION_LA_GRANJA, 800)}>
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORES.negro} />
        </TouchableOpacity>

        {rutaSugerida ? (
          <View style={[styles.cardReserva, { left: width * 0.035, right: width * 0.035 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTag}>Ruta más cercana</Text>
              <TouchableOpacity onPress={limpiarBusqueda}><Ionicons name="close-circle" size={24} color="#999999" /></TouchableOpacity>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.folioText}>Folio: {rutaSugerida.folio}</Text>
              {distanciaAprox !== null && <Text style={styles.distanciaText}>Distancia aproximada: {distanciaAprox} m</Text>}
            </View>
            <TouchableOpacity style={styles.btnSolicitar}><Text style={styles.btnSolicitarText}>Solicitar colectivo</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.legendContainer}>
            <View style={styles.legendHeader}>
              <Text style={styles.legendTitle}>Rutas rápidas disponibles</Text>
              <Text style={styles.legendCount}>{rutasConatacoch.length}</Text>
            </View>
            <FlatList
              horizontal data={rutasConatacoch} keyExtractor={(item) => String(item.folio)} showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.legendChip} onPress={() => seleccionarRutaDirecta(item)}>
                  <View style={[styles.legendColorDot, { backgroundColor: item.color || COLORES.verde }]} />
                  <Text style={styles.legendChipText}>{item.folio}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { height: 45, maxWidth: '100%' },
  mapContainer: { flex: 1, backgroundColor: '#E5E3DF' },
  map: { width: '100%', height: '100%' },
  userPin: { alignItems: 'center', justifyContent: 'center' },
  searchBar: { position: 'absolute', top: 14, height: 50, backgroundColor: '#FFFFFF', borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, elevation: 6 },
  searchInput: { flex: 1, height: '100%', fontSize: 13, color: '#000000', marginLeft: 8 },
  gpsButton: { position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  cardReserva: { position: 'absolute', bottom: 80, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, elevation: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTag: { fontSize: 12, fontWeight: '700', color: '#149E2D', textTransform: 'uppercase' },
  infoBlock: { marginBottom: 14 },
  folioText: { fontSize: 20, fontWeight: '800', color: '#000000' },
  distanciaText: { fontSize: 14, color: '#555555', marginTop: 2 },
  btnSolicitar: { backgroundColor: '#149E2D', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnSolicitarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  legendContainer: { position: 'absolute', left: 12, right: 12, bottom: 80, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, elevation: 5 },
  legendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#000000' },
  legendCount: { fontSize: 11, color: '#777777', fontWeight: '600' },
  legendChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  legendColorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendChipText: { fontSize: 11, color: '#333333', fontWeight: '700' }
});
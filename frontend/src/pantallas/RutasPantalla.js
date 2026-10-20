import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TextInput, FlatList, ScrollView, TouchableOpacity, useWindowDimensions, Platform, Keyboard, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from '../componentes/Mapa';
import { listRecords } from '../servicios/dataService';
import { normalizarRuta, COLORES_RUTAS } from './rutasConatacoch';

export default function RutasPantalla() {
  const { width } = useWindowDimensions();
  const [busqueda, setBusqueda] = useState('');
  const [rutas, setRutas] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRoutes = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await listRecords('rutas');
      setRutas(records
        .filter((route) => route.estado === 'ACTIVA' && !String(route.folio).startsWith('DEMO'))
        .map(normalizarRuta));
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar las rutas desde el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoutes(); }, []);

  const rutasFiltradas = useMemo(() => rutas.filter((ruta) => {
    const textoBuscado = busqueda.toLowerCase().trim();
    if (textoBuscado === '') return true;
    const searchable = [ruta.folio, ruta.nombre, ruta.origen, ruta.destino, ...ruta.callesIda, ...ruta.callesRegreso]
      .filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(textoBuscado);
  }), [busqueda, rutas]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.cardRuta} activeOpacity={0.7} onPress={() => setSelectedRoute(item)}>
      <View style={[styles.colorBar, { backgroundColor: item.color || COLORES_RUTAS[0] }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.folioText}>Folio {item.folio}</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
        </View>
        <View style={styles.routePreview}>
          <Ionicons name="location-outline" size={14} color="#777777" style={{ marginTop: 2 }} />
          <Text style={styles.routeText} numberOfLines={2}>
            {item.callesIda.length > 0 ? item.callesIda.slice(0, 3).join(' · ') + (item.callesIda.length > 3 ? '…' : '') : 'Trazado GPS pendiente de importar'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (selectedRoute) {
    const ida = selectedRoute.coordenadasIda || [];
    const regreso = selectedRoute.coordenadasRegreso || [];
    const firstPoint = ida[0] || regreso[0];
    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.detailHeader, { paddingHorizontal: width * 0.045 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRoute(null)}><Ionicons name="arrow-back" size={22} color="#FFFFFF" /></TouchableOpacity>
          <View style={styles.detailHeading}><Text style={styles.detailTitle}>Línea {selectedRoute.folio}</Text><Text style={styles.detailSubtitle}>{selectedRoute.nombre}</Text></View>
          <Image source={require('../../assets/logoLPng.png')} style={styles.detailLogo} resizeMode="contain" />
        </View>
        {firstPoint ? (
          <MapView provider={PROVIDER_DEFAULT} style={styles.detailMap} initialRegion={{ ...firstPoint, latitudeDelta: 0.03, longitudeDelta: 0.03 }}>
            {ida.length > 1 ? <Polyline coordinates={ida} strokeColor={selectedRoute.color} strokeWidth={6} /> : null}
            {regreso.length > 1 ? <Polyline coordinates={regreso} strokeColor="#2878D7" strokeWidth={5} lineDashPattern={[7, 6]} /> : null}
            {ida.length ? <Marker coordinate={ida[0]} title="Inicio ida" /> : null}
            {ida.length ? <Marker coordinate={ida[ida.length - 1]} title="Fin ida" /> : null}
          </MapView>
        ) : <View style={styles.noGeometry}><Ionicons name="map-outline" size={44} color="#9AA39A" /><Text style={styles.noGeometryTitle}>El trazado GPS aún no está disponible</Text><Text style={styles.noGeometryText}>Carga la fixture de rutas de La Granja en PostgreSQL para mostrar el recorrido.</Text></View>}
        <ScrollView style={styles.routeDetailBody} contentContainerStyle={styles.routeDetailContent}>
          <Text style={styles.detailRouteName}>{selectedRoute.nombre}</Text>
          <Text style={styles.detailEndpoints}>{selectedRoute.origen} ↔ {selectedRoute.destino}</Text>
          {selectedRoute.descripcion ? <Text style={styles.routeNote}>{selectedRoute.descripcion}</Text> : null}
          <Text style={styles.sectionHeading}>Calles de ida</Text>
          {selectedRoute.callesIda.length ? selectedRoute.callesIda.map((street, index) => <Text key={`ida-${index}`} style={styles.streetLine}>{index + 1}. {street}</Text>) : <Text style={styles.noStreets}>Sin calles de ida cargadas.</Text>}
          <Text style={styles.sectionHeading}>Calles de regreso</Text>
          {selectedRoute.callesRegreso.length ? selectedRoute.callesRegreso.map((street, index) => <Text key={`regreso-${index}`} style={styles.streetLine}>{index + 1}. {street}</Text>) : <Text style={styles.noStreets}>Sin calles de regreso cargadas.</Text>}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.045 }]}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logoLPng.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#777777" />
          <TextInput style={styles.searchInput} placeholder="Buscar folio o calle (ej: Santa Rosa)..." placeholderTextColor="#888888" value={busqueda} onChangeText={setBusqueda} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="search" />
          {busqueda.length > 0 && <TouchableOpacity onPress={() => { setBusqueda(''); Keyboard.dismiss(); }}><Ionicons name="close-circle" size={20} color="#888888" /></TouchableOpacity>}
        </View>
      </View>

      {loading ? <View style={styles.loadingState}><ActivityIndicator size="large" color="#149E2D" /><Text style={styles.emptyText}>Cargando rutas oficiales...</Text></View> : null}
      {!loading && error ? <View style={styles.loadingState}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={loadRoutes}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity></View> : null}
      {!loading && !error ? <FlatList data={rutasFiltradas} keyExtractor={(item) => String(item.id || item.folio)} renderItem={renderItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="bus-outline" size={48} color="#CCCCCC" /><Text style={styles.emptyText}>{rutas.length ? `No se encontraron rutas para "${busqueda}"` : 'No hay rutas oficiales cargadas en PostgreSQL.'}</Text><Text style={styles.emptyHint}>Carga core/fixtures/la_granja_routes.json con el comando loaddata para mostrar las rutas.</Text></View>} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center' },
  detailHeading: { flex: 1 },
  detailTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  detailSubtitle: { color: '#CFCFCF', fontSize: 12, marginTop: 2 },
  detailLogo: { width: 92, height: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 220, height: 45 },
  searchContainer: { backgroundColor: '#000000', paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  searchBar: { height: 46, backgroundColor: '#FFFFFF', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: '#000000', marginLeft: 8 },
  listContainer: { padding: 16, paddingBottom: 100 },
  cardRuta: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  colorBar: { width: 8, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  folioText: { fontSize: 18, fontWeight: '800', color: '#000000' },
  routePreview: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 10 },
  routeText: { fontSize: 13, color: '#666666', marginLeft: 6, lineHeight: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#888888', textAlign: 'center' },
  emptyHint: { marginTop: 8, fontSize: 12, color: '#777777', textAlign: 'center', lineHeight: 18 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  errorText: { color: '#B00020', fontSize: 14, textAlign: 'center' },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#149E2D' },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  detailMap: { height: 330, width: '100%' },
  noGeometry: { height: 260, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, backgroundColor: '#E9ECE9' },
  noGeometryTitle: { marginTop: 12, color: '#333333', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  noGeometryText: { marginTop: 7, color: '#666666', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  routeDetailBody: { flex: 1 },
  routeDetailContent: { padding: 18, paddingBottom: 32 },
  detailRouteName: { color: '#111111', fontSize: 19, fontWeight: '900' },
  detailEndpoints: { color: '#666666', fontSize: 14, marginTop: 4 },
  routeNote: { color: '#777777', fontSize: 12, lineHeight: 17, marginTop: 8 },
  sectionHeading: { color: '#149E2D', fontSize: 13, fontWeight: '900', marginTop: 18, marginBottom: 7, textTransform: 'uppercase' },
  streetLine: { color: '#333333', fontSize: 13, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  noStreets: { color: '#777777', fontSize: 13 }
});

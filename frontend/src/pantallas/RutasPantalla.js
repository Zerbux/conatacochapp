import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listRecords } from '../servicios/dataService';
import { normalizarRuta } from './rutasConatacoch';

export default function RutasPantalla() {
  const { width } = useWindowDimensions();
  const [busqueda, setBusqueda] = useState('');
  const [rutas, setRutas] = useState([]);
  const [abierta, setAbierta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    listRecords('rutas')
      .then((records) => {
        if (mounted) setRutas(records.filter((route) => !String(route.folio).startsWith('DEMO')).map(normalizarRuta));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'No se pudo cargar el catálogo de rutas.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const rutasFiltradas = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase('es-CL');
    if (!query) return rutas;
    return rutas.filter((route) => [
      route.nombre, route.folio, route.origen, route.destino, route.descripcion, route.estado,
      ...route.callesIda, ...route.callesRegreso, ...route.callesIdaAlternativa, ...route.callesRegresoAlternativa,
    ].filter(Boolean).join(' ').toLocaleLowerCase('es-CL').includes(query));
  }, [busqueda, rutas]);

  const renderRoute = ({ item }) => {
    const expanded = String(abierta) === String(item.id);
    const sentidos = [
      item.callesIda.length || item.coordenadasIda.length ? 'Ida' : null,
      item.callesRegreso.length || item.coordenadasRegreso.length ? 'Regreso' : null,
      item.callesIdaAlternativa.length || item.callesRegresoAlternativa.length ? 'Alternativo' : null,
    ].filter(Boolean);
    return (
      <TouchableOpacity
        style={styles.routeCard}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setAbierta(expanded ? null : item.id)}
      >
        <View style={[styles.colorBand, { backgroundColor: item.color || '#777777' }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeading}>
            <View style={styles.titleBlock}>
              <Text style={styles.routeName}>{item.nombre || ('Ruta ' + item.folio)}</Text>
              <Text style={styles.routeMeta}>{'Folio ' + item.folio + ' · ' + (item.origen || 'Origen no informado') + ' → ' + (item.destino || 'Destino no informado')}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={21} color="#6B7280" />
          </View>
          {item.imagen ? (
            <Image source={{ uri: item.imagen }} style={styles.routeImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={28} color="#9AA39A" />
              <Text style={styles.placeholderText}>Imagen de ruta no disponible</Text>
            </View>
          )}
          {expanded ? (
            <View style={styles.expandedInfo}>
              <Text style={styles.sectionHeading}>Información de la ruta</Text>
              <InfoRow label="Nombre" value={item.nombre} />
              <InfoRow label="Folio" value={item.folio} />
              <InfoRow label="Origen" value={item.origen} />
              <InfoRow label="Destino" value={item.destino} />
              <InfoRow label="Sentido" value={sentidos.length ? sentidos.join(' / ') : 'No informado'} />
              <InfoRow label="Estado" value={item.estado || 'No informado'} />
              <InfoRow label="Tiempo aproximado" value="No informado" />
              <InfoRow label="Descripción" value={item.descripcion || 'Sin descripción disponible.'} />
              <InfoRow label="Geometría GPS" value={item.geometriaVerificada ? 'Disponible' : 'No cargada'} />
              {item.callesIda.length ? <InfoRow label="Calles de ida" value={item.callesIda.join(' · ')} /> : null}
              {item.callesRegreso.length ? <InfoRow label="Calles de regreso" value={item.callesRegreso.join(' · ')} /> : null}
              {item.callesIdaAlternativa.length ? <InfoRow label="Itinerario alternativo · ida" value={item.callesIdaAlternativa.join(' · ')} /> : null}
              {item.callesRegresoAlternativa.length ? <InfoRow label="Itinerario alternativo · regreso" value={item.callesRegresoAlternativa.join(' · ')} /> : null}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.045 }]}>
        <View style={styles.heading}>
          <View>
            <Text style={styles.title}>Rutas e información</Text>
            <Text style={styles.subtitle}>Catálogo de recorridos CONATACOCH</Text>
          </View>
          <Ionicons name="bus-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#777777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ruta, folio o calle..."
            placeholderTextColor="#888888"
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
          />
          {busqueda ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={20} color="#888888" /></TouchableOpacity> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#149E2D" />
          <Text style={styles.emptyText}>Cargando catálogo de rutas...</Text>
        </View>
      ) : error ? (
        <View style={styles.loading}>
          <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rutasFiltradas}
          keyExtractor={(item) => String(item.id || item.folio)}
          renderItem={renderRoute}
          extraData={abierta}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={44} color="#B8BEB8" />
              <Text style={styles.emptyText}>{rutas.length ? 'No hay coincidencias.' : 'No hay rutas cargadas en el catálogo.'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F4' },
  header: { backgroundColor: '#111111', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 14, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#E0E0E0', fontSize: 15, lineHeight: 21, marginTop: 4 },
  searchBar: { minHeight: 52, borderRadius: 14, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, fontSize: 16, color: '#222222', marginLeft: 9 },
  listContent: { padding: 14, paddingBottom: 115 },
  routeCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 13, overflow: 'hidden', elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4 },
  colorBand: { width: 6 },
  cardBody: { flex: 1, padding: 13 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  titleBlock: { flex: 1 },
  routeName: { color: '#161816', fontSize: 19, lineHeight: 25, fontWeight: '900' },
  routeMeta: { color: '#454B45', fontSize: 14, lineHeight: 20, marginTop: 5 },
  routeImage: { width: '100%', height: 155, borderRadius: 9, backgroundColor: '#EDF0ED' },
  imagePlaceholder: { width: '100%', height: 125, borderRadius: 9, backgroundColor: '#EDF0ED', alignItems: 'center', justifyContent: 'center', gap: 5 },
  placeholderText: { color: '#777777', fontSize: 11 },
  expandedInfo: { marginTop: 13, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 10 },
  sectionHeading: { color: '#222922', fontSize: 13, fontWeight: '900', marginBottom: 7 },
  infoRow: { marginTop: 7 },
  infoLabel: { color: '#535D53', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { color: '#272D27', fontSize: 15, lineHeight: 21, marginTop: 3 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 42 },
  emptyText: { color: '#777777', fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 8 },
  errorText: { color: '#9A3412', fontSize: 13, textAlign: 'center' },
});

import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, useWindowDimensions, Platform, Keyboard, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rutasConatacoch, COLORES_RUTAS } from './rutasConatacoch';

export default function RutasPantalla() {
  const { width } = useWindowDimensions();
  const [busqueda, setBusqueda] = useState('');

  const rutasFiltradas = rutasConatacoch.filter((ruta) => {
    const textoBuscado = busqueda.toLowerCase().trim();
    if (textoBuscado === '') return true;
    return ruta.folio.toLowerCase().includes(textoBuscado) || 
           ruta.callesIda.some(c => c.toLowerCase().includes(textoBuscado)) || 
           ruta.callesRegreso.some(c => c.toLowerCase().includes(textoBuscado));
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.cardRuta} activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: item.color || COLORES_RUTAS[0] }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.folioText}>Folio {item.folio}</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
        </View>
        <View style={styles.routePreview}>
          <Ionicons name="location-outline" size={14} color="#777777" style={{ marginTop: 2 }} />
          <Text style={styles.routeText} numberOfLines={2}>
            {item.callesIda.length > 0 ? item.callesIda.slice(0, 3).join(', ') + (item.callesIda.length > 3 ? '...' : '') : 'Ruta en desarrollo'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

      <FlatList data={rutasFiltradas} keyExtractor={(item) => String(item.folio)} renderItem={renderItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="bus-outline" size={48} color="#CCCCCC" /><Text style={styles.emptyText}>No se encontraron rutas para "{busqueda}"</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 16 },
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
  emptyText: { marginTop: 12, fontSize: 15, color: '#888888', textAlign: 'center' }
});
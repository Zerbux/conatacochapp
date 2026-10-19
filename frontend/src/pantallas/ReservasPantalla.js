import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, useWindowDimensions, Platform, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ReservasPantalla() {
  const { width } = useWindowDimensions();
  const [filtro, setFiltro] = useState('activas');

  const misReservas = [
    { id: '1', folio: '233003', fecha: 'Hoy, 08:30 AM', estado: 'Completado', tipo: 'historial' },
    { id: '2', folio: '233005', fecha: 'Ayer, 18:15 PM', estado: 'Completado', tipo: 'historial' },
    { id: '3', folio: '233012', fecha: '15 Oct, 07:45 AM', estado: 'Cancelado', tipo: 'historial' }
  ];

  const reservasFiltradas = misReservas.filter((reserva) => reserva.tipo === filtro);

  const renderItem = ({ item }) => (
    <View style={styles.cardReserva}>
      <View style={styles.cardHeader}>
        <View style={styles.folioBadge}><Text style={styles.folioBadgeText}>Folio {item.folio}</Text></View>
        <Text style={[styles.estadoText, { color: item.estado === 'Completado' ? '#149E2D' : '#D81B60' }]}>{item.estado}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}><Ionicons name="calendar-outline" size={16} color="#777777" /><Text style={styles.infoText}>{item.fecha}</Text></View>
        <View style={styles.infoRow}><MaterialCommunityIcons name="car-info" size={16} color="#777777" /><Text style={styles.infoText}>Solicitud de taxi colectivo urbano</Text></View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.045 }]}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logoLPng.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, filtro === 'activas' && styles.tabActive]} onPress={() => setFiltro('activas')}>
          <Text style={[styles.tabText, filtro === 'activas' && styles.tabTextActive]}>En curso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filtro === 'historial' && styles.tabActive]} onPress={() => setFiltro('historial')}>
          <Text style={[styles.tabText, filtro === 'historial' && styles.tabTextActive]}>Historial</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={reservasFiltradas} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="receipt-outline" size={48} color="#CCCCCC" /><Text style={styles.emptyText}>{filtro === 'activas' ? 'No tienes colectivos en camino.' : 'Aún no tienes un historial de viajes.'}</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 48 : 32, paddingBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 220, height: 45 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#149E2D' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888888' },
  tabTextActive: { color: '#149E2D', fontWeight: '800' },
  listContainer: { padding: 16, paddingBottom: 100 },
  cardReserva: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  folioBadge: { backgroundColor: '#F4F4F4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  folioBadgeText: { fontSize: 13, fontWeight: '800', color: '#000000' },
  estadoText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#555555', marginLeft: 6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#888888', textAlign: 'center' }
});
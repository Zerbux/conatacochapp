import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PerfilPantalla({ onLoginPress }) {
  const { width } = useWindowDimensions();
  const opcionesMenu = ['Informacion', 'Seguridad', 'Legal', 'Pagos', 'Ayuda', 'Configuracion'];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: width * 0.045 }]}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logoLPng.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.bodyContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person-outline" size={60} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.loginButtonWrapper}>
            <TouchableOpacity style={styles.loginButton} onPress={onLoginPress}>
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuContainer}>
            {opcionesMenu.map((opcion, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.7}>
                <Text style={styles.menuTitle}>{opcion}</Text>
                <Ionicons name="chevron-down" size={20} color="#333333" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 50 : 32, paddingBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 220, height: 45 },
  bodyContainer: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  avatarWrapper: { alignItems: 'center', marginTop: 20, marginBottom: 16 },
  avatarCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#149E2D', justifyContent: 'center', alignItems: 'center' },
  loginButtonWrapper: { alignItems: 'center', marginBottom: 30 },
  loginButton: { backgroundColor: '#149E2D', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  menuContainer: { gap: 12 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 10 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#333333' }
});
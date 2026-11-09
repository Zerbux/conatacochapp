import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MapView({ style }) {
  return (
    <View style={[styles.container, style]} accessibilityRole="note">
      <Text style={styles.title}>Mapa disponible en la app móvil</Text>
      <Text style={styles.message}>
        En la versión web puedes seguir usando las demás secciones de CONATACOCH.
      </Text>
    </View>
  );
}

export function Marker() {
  return null;
}

export function Circle() {
  return null;
}

export function Polyline() {
  return null;
}

export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
  },
  title: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    maxWidth: 420,
    marginTop: 8,
    color: '#555555',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});

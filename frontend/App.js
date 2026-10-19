import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// IMPORTACIONES DE TODAS LAS PANTALLAS (AquÃ­ estÃ¡ la clave del error)
import InicioUsuarioPantalla from './src/pantallas/InicioUsuarioPantalla';
import RutasPantalla from './src/pantallas/RutasPantalla';
import ReservasPantalla from './src/pantallas/ReservasPantalla';
import PerfilPantalla from './src/pantallas/PerfilPantalla';
import LoginPantalla from './src/pantallas/LoginPantalla'; 
import RegistroPantalla from './src/pantallas/RegistroPantalla';
import InicioChoferPantalla from './src/choferes/InicioChoferPantalla';
import AdminNavigator from './src/administrador/AdminNavigator';

export default function App() {
  const [pantallaActual, setPantallaActual] = useState('inicio');
  const [areaActual, setAreaActual] = useState('pasajero');

  const manejarLogin = (usuario) => {
    const rol = String(usuario?.tipo_usuario || '').toUpperCase();
    if (rol === 'CONDUCTOR') {
      if (!usuario.access && !usuario.access_token) {
        Alert.alert(
          'Acceso bloqueado',
          'El servidor no entrega una sesión segura para el rol conductor. Usa el acceso DEMO hasta que el backend implemente permisos.',
        );
        return;
      }
      setAreaActual('conductor');
      return;
    }
    if (rol === 'ADMIN') {
      if (!usuario.access && !usuario.access_token) {
        Alert.alert(
          'Acceso bloqueado',
          'El servidor no entrega una sesión segura para el rol administrador. Usa el acceso DEMO hasta que el backend implemente permisos.',
        );
        return;
      }
      setAreaActual('administrador');
      return;
    }
    setAreaActual('pasajero');
    setPantallaActual('inicio');
  };

  const volverAPasajero = () => {
    setAreaActual('pasajero');
    setPantallaActual('perfil');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Contenedor principal de las vistas */}
        <View style={styles.content}>
          {areaActual === 'conductor' ? (
            <InicioChoferPantalla onLogout={volverAPasajero} />
          ) : areaActual === 'administrador' ? (
            <AdminNavigator onLogout={volverAPasajero} />
          ) : (
            <>
              {pantallaActual === 'inicio' && <InicioUsuarioPantalla />}
              {pantallaActual === 'rutas' && <RutasPantalla />}
              {pantallaActual === 'reservas' && <ReservasPantalla />}
              {pantallaActual === 'perfil' && <PerfilPantalla onLoginPress={() => setPantallaActual('login')} />}
              {pantallaActual === 'login' && (
                <LoginPantalla
                  onVolver={() => setPantallaActual('perfil')}
                  onLogin={manejarLogin}
                  onChoferPress={() => setAreaActual('conductor')}
                  onAdminPress={() => setAreaActual('administrador')}
                  onIrRegistro={() => setPantallaActual('registro')}
                />
              )}
              {pantallaActual === 'registro' && (
                <RegistroPantalla onVolver={() => setPantallaActual('login')} />
              )}
            </>
          )}
        </View>

        {/* Navbar Flotante sobre el Mapa sin Fondo Negro */}
        {/* Ocultamos el navbar si estamos en la pantalla de login */}
        {areaActual === 'pasajero' && pantallaActual !== 'login' && (
          <View style={styles.navbar}>
            <TouchableOpacity style={styles.navItem} onPress={() => setPantallaActual('inicio')}>
              <Ionicons 
                name={pantallaActual === 'inicio' ? "home" : "home-outline"} 
                size={24} 
                color={pantallaActual === 'inicio' ? "#149E2D" : "#000000"} 
              />
              <Text style={[styles.navText, pantallaActual === 'inicio' && styles.navTextActivo]}>
                Inicio
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setPantallaActual('rutas')}>
              <MaterialCommunityIcons 
                name="map-outline" 
                size={24} 
                color={pantallaActual === 'rutas' ? "#149E2D" : "#000000"} 
              />
              <Text style={[styles.navText, pantallaActual === 'rutas' && styles.navTextActivo]}>
                Rutas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setPantallaActual('reservas')}>
              <MaterialCommunityIcons 
                name="clipboard-text-outline" 
                size={24} 
                color={pantallaActual === 'reservas' ? "#149E2D" : "#000000"} 
              />
              <Text style={[styles.navText, pantallaActual === 'reservas' && styles.navTextActivo]}>
                Reservas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setPantallaActual('perfil')}>
              <Ionicons 
                name={pantallaActual === 'perfil' ? "person" : "person-outline"} 
                size={24} 
                color={pantallaActual === 'perfil' ? "#149E2D" : "#000000"} 
              />
              <Text style={[styles.navText, pantallaActual === 'perfil' && styles.navTextActivo]}>
                Perfil
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    color: '#000000',
    marginTop: 2,
    fontWeight: '500',
  },
  navTextActivo: {
    color: '#149E2D',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

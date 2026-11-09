import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureTemporarySession } from './src/servicios/guestSessionService';
import { logout as logoutSession } from './src/servicios/authService';

// IMPORTACIONES DE TODAS LAS PANTALLAS (AquÃ­ estÃ¡ la clave del error)
import InicioUsuarioPantalla from './src/pantallas/InicioUsuarioPantalla';
import ReservasPantalla from './src/pantallas/ReservasPantalla';
import PerfilPantalla from './src/pantallas/PerfilPantalla';
import LoginPantalla from './src/pantallas/LoginPantalla'; 
import RegistroPantalla from './src/pantallas/RegistroPantalla';
import InicioChoferPantalla from './src/choferes/InicioChoferPantalla';
import AdminNavigator from './src/administrador/AdminNavigator';

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [pantallaActual, setPantallaActual] = useState('inicio');
  const [areaActual, setAreaActual] = useState('pasajero');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const initializeSession = async () => {
    setSessionError('');
    try {
      await ensureTemporarySession();
      setSessionReady(true);
    } catch (error) {
      setSessionError(error.message || 'No fue posible iniciar la sesion temporal.');
      setSessionReady(true);
    }
  };

  useEffect(() => {
    initializeSession();
  }, []);

  const manejarLogin = (usuario) => {
    setSessionError('');
    const rol = String(usuario?.tipo_usuario || '').toUpperCase();
    if (rol === 'CONDUCTOR') {
      if (usuario.modo !== 'MOCK' && !usuario.key && !usuario.access && !usuario.access_token) {
        Alert.alert(
          'Acceso bloqueado',
          'El servidor no entregó una sesión segura para el rol conductor.',
        );
        return;
      }
      setAreaActual('conductor');
      return;
    }
    if (rol === 'ADMIN') {
      if (usuario.modo !== 'MOCK' && !usuario.key && !usuario.access && !usuario.access_token) {
        Alert.alert(
          'Acceso bloqueado',
          'El servidor no entregó una sesión segura para el rol administrador.',
        );
        return;
      }
      setAreaActual('administrador');
      return;
    }
    setUsuarioActual(usuario);
    setAreaActual('pasajero');
    setPantallaActual('inicio');
  };

  const volverAPasajero = () => {
    setUsuarioActual(null);
    setAreaActual('pasajero');
    setPantallaActual('perfil');
    ensureTemporarySession().catch(() => {});
  };

  const cerrarSesionPasajero = async () => {
    try {
      await logoutSession();
    } finally {
      try {
        await ensureTemporarySession();
      } catch (_error) {
        // Mantiene visible el perfil aunque el servidor no permita renovar la sesión temporal.
      }
      setUsuarioActual(null);
      setAreaActual('pasajero');
      setPantallaActual('perfil');
    }
  };

  if (!sessionReady) {
    return (
      <View style={styles.sessionLoading}>
          {sessionError ? (
            <>
              <Text style={styles.sessionError}>{sessionError}</Text>
              <TouchableOpacity style={styles.sessionRetry} onPress={initializeSession}>
                <Text style={styles.sessionRetryText}>Reintentar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#149E2D" />
              <Text style={styles.sessionLoadingText}>Preparando sesion...</Text>
            </>
          )}
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {sessionError ? (
          <View style={styles.sessionNotice}>
            <Text style={styles.sessionNoticeText}>{sessionError}</Text>
            <TouchableOpacity style={styles.sessionNoticeButton} onPress={initializeSession}>
              <Text style={styles.sessionNoticeButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Contenedor principal de las vistas */}
        <View style={styles.content}>
          {areaActual === 'conductor' ? (
            <InicioChoferPantalla onLogout={volverAPasajero} />
          ) : areaActual === 'administrador' ? (
            <AdminNavigator onLogout={volverAPasajero} />
          ) : (
            <>
              {pantallaActual === 'inicio' && <InicioUsuarioPantalla usuarioActual={usuarioActual} />}
              {pantallaActual === 'reservas' && <ReservasPantalla />}
              {pantallaActual === 'perfil' && <PerfilPantalla user={usuarioActual} onLoginPress={() => setPantallaActual('login')} onLogout={cerrarSesionPasajero} />}
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
                <RegistroPantalla
                  onVolver={() => setPantallaActual('login')}
                  onContinuarSinCuenta={async () => {
                    try {
                      await logoutSession();
                      await ensureTemporarySession();
                      setUsuarioActual(null);
                      setAreaActual('pasajero');
                      setPantallaActual('inicio');
                    } catch (error) {
                      Alert.alert(
                        'No se pudo continuar como invitado',
                        error.message || 'No fue posible iniciar la sesión temporal.',
                      );
                    }
                  }}
                />
              )}
            </>
          )}
        </View>

        {/* Navbar Flotante sobre el Mapa sin Fondo Negro */}
        {/* Ocultamos el navbar si estamos en la pantalla de login */}
        {areaActual === 'pasajero' && pantallaActual !== 'login' && (
          <View style={[styles.navbar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) }]}>
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
  );
}

const styles = StyleSheet.create({
  sessionLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  sessionLoadingText: { marginTop: 12, color: '#333333', fontSize: 15 },
  sessionError: { color: '#B00020', fontSize: 15, textAlign: 'center', marginBottom: 14 },
  sessionNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD', paddingHorizontal: 12, paddingVertical: 9 },
  sessionNoticeText: { flex: 1, color: '#734D00', fontSize: 12, marginRight: 10 },
  sessionNoticeButton: { backgroundColor: '#149E2D', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  sessionNoticeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sessionRetry: { backgroundColor: '#149E2D', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  sessionRetryText: { color: '#FFFFFF', fontWeight: '700' },
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
    minHeight: 56,
    flex: 1,
  },
  navText: {
    fontSize: 14,
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

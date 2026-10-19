import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, Alert, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginPantalla({ onLogin, onIrRegistro, onChoferPress, onAdminPress }) {
  // Cambiamos 'correo' por 'credencial' para que sea flexible
  const [credencial, setCredencial] = useState(''); 
  const [password, setPassword] = useState('');

  const manejarLogin = async () => {
    if (!credencial || !password) {
      Alert.alert('Error', 'Por favor ingresa tu credencial y contraseña.');
      return;
    }

    try {
      // IMPORTANTE: Cambia esta IP por tu IP local real
      const respuesta = await fetch('http://192.168.1.185:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credencial: credencial.trim().toLowerCase(), // Enviamos 'credencial'
          password: password
        }),
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        // Guardamos los datos de la sesión real en el teléfono
        await AsyncStorage.setItem('usuarioData', JSON.stringify(data));
        
        // Avisamos a App.js que el login fue exitoso
        onLogin(data); 
      } else {
        Alert.alert('Acceso Denegado', data.error || 'Credenciales inválidas.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.contenedorPrincipal}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <SafeAreaView style={styles.headerBackground}>
            <View style={styles.headerContent}>
              <Image source={require('../../assets/logoLPng.png')} style={styles.logo} resizeMode="contain" />
            </View>
          </SafeAreaView>

          <View style={styles.tarjetaBlanca}>
            <View style={styles.tituloContenedor}>
              <Text style={styles.titulo}>Iniciar Sesión</Text>
              <Text style={styles.subtitulo}>Ingresa a tu cuenta para continuar</Text>
            </View>

            <View style={styles.formulario}>
              {/* Actualizamos la etiqueta para indicar que acepta ambas opciones */}
              <Text style={styles.label}>Correo o Nombre de usuario</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: juan@mail.com o USR-juan" 
                placeholderTextColor="#A0A0A0"
                value={credencial} 
                onChangeText={setCredencial} 
                autoCapitalize="none" 
              />

              <Text style={styles.label}>Contraseña</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Tu contraseña" 
                placeholderTextColor="#A0A0A0"
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
              />

              <TouchableOpacity style={styles.botonLogin} onPress={manejarLogin}>
                <Text style={styles.textoBotonLogin}>Ingresar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botonVolver} onPress={() => onIrRegistro()}>
                <Text style={styles.textoBotonVolver}>¿No tienes cuenta? Regístrate aquí</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonVolver} onPress={onChoferPress}>
                <Text style={styles.textoBotonVolver}>Acceso para conductores</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonVolver} onPress={onAdminPress}>
                <Text style={styles.textoBotonVolver}>Acceso administrativo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedorPrincipal: { flex: 1, backgroundColor: '#000000' },
  innerContainer: { flex: 1 },
  headerBackground: { backgroundColor: '#000000', height: 180, justifyContent: 'center' },
  headerContent: { alignItems: 'center' },
  logo: { height: 80, width: 250 },
  tarjetaBlanca: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, paddingTop: 40, paddingHorizontal: 25 },
  tituloContenedor: { alignItems: 'center', marginBottom: 30 },
  titulo: { color: '#000000', fontSize: 24, fontWeight: 'bold' },
  subtitulo: { color: '#666666', fontSize: 15, marginTop: 5 },
  formulario: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 20, color: '#000000', fontSize: 15 },
  botonLogin: { backgroundColor: '#1A9C43', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  textoBotonLogin: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  botonVolver: { marginTop: 25, alignItems: 'center' },
  textoBotonVolver: { color: '#1A9C43', fontSize: 15, fontWeight: '600' }
});
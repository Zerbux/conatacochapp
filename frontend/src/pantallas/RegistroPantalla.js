import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RegistroPantalla({ onVolver }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const manejarRegistro = async () => {
    // === VALIDACIONES ESTRICTAS ===
    const regexNombre = /^[a-zA-ZÀ-ÿ\s]{3,50}$/; 
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 

    if (!nombre || !correo || !telefono || !password) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    if (!regexNombre.test(nombre.trim())) {
      Alert.alert('Datos Inválidos', 'El nombre solo debe contener letras y tener al menos 3 caracteres.');
      return;
    }
    if (!regexCorreo.test(correo.trim())) {
      Alert.alert('Datos Inválidos', 'Ingresa un correo electrónico válido (ej: usuario@mail.com).');
      return;
    }
    if (telefono.length < 8) {
      Alert.alert('Datos Inválidos', 'El número de teléfono es muy corto.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Seguridad', 'La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }
    if (password !== confirmarPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      telefono: telefono.trim(),
      password: password
    };

    try {
      const respuesta = await fetch('http://192.168.1.185:8000/api/registro-usuario/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = respuesta.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await respuesta.json();
        
        if (respuesta.ok) {
          Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido registrada con éxito.', [
            { text: 'Iniciar Sesión', onPress: () => onVolver() }
          ]);
        } else {
          Alert.alert('Error al registrar', data.error || 'Verifica los datos.');
        }
      } else {
        Alert.alert('Error', 'Fallo en la comunicación con el servidor.');
      }
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
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
              <Image 
                source={require('../../assets/logoLPng.png')} 
                style={styles.logo} 
                resizeMode="contain" 
              />
              <TouchableOpacity>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View style={styles.tarjetaBlanca}>
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.tituloContenedor}>
                <Text style={styles.titulo}>Registro de Usuario</Text>
                <Text style={styles.subtitulo}>Crea tu cuenta para guardar tus viajes</Text>
              </View>

              <View style={styles.formulario}>
                
                <Text style={styles.label}>Nombre Completo</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ej: Juan Pérez" 
                  placeholderTextColor="#A0A0A0"
                  value={nombre} 
                  onChangeText={setNombre} 
                />

                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="tucorreo@ejemplo.com" 
                  placeholderTextColor="#A0A0A0"
                  value={correo} 
                  onChangeText={setCorreo} 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                />

                <Text style={styles.label}>Teléfono</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="+56 9 1234 5678" 
                  placeholderTextColor="#A0A0A0"
                  value={telefono} 
                  onChangeText={setTelefono} 
                  keyboardType="phone-pad" 
                />

                <Text style={styles.label}>Contraseña</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Mínimo 6 caracteres" 
                  placeholderTextColor="#A0A0A0"
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry 
                />

                <Text style={styles.label}>Confirmar Contraseña</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Repite tu contraseña" 
                  placeholderTextColor="#A0A0A0"
                  value={confirmarPassword} 
                  onChangeText={setConfirmarPassword} 
                  secureTextEntry 
                />

                <TouchableOpacity style={styles.botonRegistrar} onPress={manejarRegistro}>
                  <Text style={styles.textoBotonRegistrar}>Crear cuenta</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.botonVolver} 
                  onPress={() => onVolver()}
                >
                  <Text style={styles.textoBotonVolver}>¿Ya tienes cuenta? Inicia Sesión</Text>
                </TouchableOpacity>

              </View>
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#000000', 
  },
  innerContainer: {
    flex: 1,
  },
  headerBackground: {
    backgroundColor: '#000000',
    height: 140, 
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'android' ? 40 : 10,
  },
  logo: {
    height: 40,
    width: 200,
  },
  tarjetaBlanca: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    marginTop: -25, 
    paddingTop: 25,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  tituloContenedor: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  titulo: {
    color: '#000000',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#666666',
    fontSize: 14,
    marginTop: 5,
  },
  formulario: {
    paddingHorizontal: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5', 
    borderRadius: 12, 
    padding: 16,
    marginBottom: 18,
    color: '#000000',
    fontSize: 15,
  },
  botonRegistrar: {
    backgroundColor: '#1A9C43', 
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  textoBotonRegistrar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonVolver: {
    marginTop: 25,
    alignItems: 'center',
  },
  textoBotonVolver: {
    color: '#1A9C43', 
    fontSize: 15,
    fontWeight: '600',
  },
});
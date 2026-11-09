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
import { apiRequest } from '../servicios/apiService';

export default function RegistroPantalla({ onVolver, onContinuarSinCuenta }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [apellidoUsuario, setApellidoUsuario] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const DismissContainer = Platform.OS === 'web' ? View : TouchableWithoutFeedback;

  const reportError = (title, message) => {
    setErrorMessage(message);
    if (Platform.OS !== 'web') Alert.alert(title, message);
  };

  const manejarRegistro = async () => {
    // === VALIDACIONES ESTRICTAS ===
    const regexNombre = /^[a-zA-ZÀ-ÿ\s]{2,50}$/;
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 

    if (!nombreUsuario || !apellidoUsuario || !correo || !telefono || !password) {
      reportError('Error', 'Todos los campos son obligatorios.');
      return;
    }
    if (!regexNombre.test(nombreUsuario.trim()) || !regexNombre.test(apellidoUsuario.trim())) {
      reportError('Datos Inválidos', 'El nombre y el apellido deben contener solo letras y tener al menos 2 caracteres.');
      return;
    }
    if (!regexCorreo.test(correo.trim())) {
      reportError('Datos Inválidos', 'Ingresa un correo electrónico válido (ej: usuario@mail.com).');
      return;
    }
    if (telefono.length < 8) {
      reportError('Datos Inválidos', 'El número de teléfono es muy corto.');
      return;
    }
    if (password.length < 8) {
      reportError('Seguridad', 'La contraseña debe tener un mínimo de 8 caracteres.');
      return;
    }
    if (password !== confirmarPassword) {
      reportError('Error', 'Las contraseñas no coinciden.');
      return;
    }

    const payload = {
      nombre_usuario: nombreUsuario.trim(),
      apellido_usuario: apellidoUsuario.trim(),
      correo: correo.trim().toLowerCase(),
      telefono: telefono.trim(),
      password,
    };

    try {
      await apiRequest('/api/registro-usuario/', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify(payload),
      });
      setErrorMessage('');
      setRegistrationComplete(true);
      if (Platform.OS !== 'web') {
        Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido registrada con éxito.', [
          { text: 'Iniciar Sesión', onPress: () => onVolver() }
        ]);
      }
    } catch (error) {
      reportError('Error al registrar', error.message || 'No se pudo conectar con el servidor.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.contenedorPrincipal}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <DismissContainer {...(Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss })}>
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
                <Text style={styles.subtitulo}>Crea una cuenta para guardar tus viajes. Registrarte es opcional para solicitar un match.</Text>
              </View>

              <View style={styles.formulario}>
                {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}
                {registrationComplete ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>Tu cuenta fue registrada. Ya puedes iniciar sesion.</Text>
                    <TouchableOpacity style={styles.botonRegistrar} onPress={onVolver}>
                      <Text style={styles.textoBotonRegistrar}>Iniciar sesion</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                
                <Text style={styles.label}>Nombre</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ej: Juan"
                  placeholderTextColor="#A0A0A0"
                  value={nombreUsuario}
                  onChangeText={setNombreUsuario}
                />

                <Text style={styles.label}>Apellido</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Pérez"
                  placeholderTextColor="#A0A0A0"
                  value={apellidoUsuario}
                  onChangeText={setApellidoUsuario}
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
                  placeholder="Mínimo 8 caracteres"
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
                {onContinuarSinCuenta ? (
                  <TouchableOpacity
                    style={styles.botonVolver}
                    onPress={onContinuarSinCuenta}
                  >
                    <Text style={styles.textoBotonVolver}>Continuar como invitado sin registrarme</Text>
                  </TouchableOpacity>
                ) : null}

              </View>
            </ScrollView>
          </View>
        </View>
      </DismissContainer>
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
  errorText: { color: '#B00020', fontSize: 13, marginBottom: 10 },
  successBox: { backgroundColor: '#EAF7ED', borderRadius: 10, padding: 14, marginBottom: 12 },
  successText: { color: '#176B2C', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});

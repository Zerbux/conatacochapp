import * as Location from 'expo-location';
import { Platform } from 'react-native';

export async function requestForegroundLocationPermission() {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status;
}

export async function getCurrentLocation() {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('No hay permiso de ubicación. Autoriza el GPS para continuar.');
  }
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}

export async function geocodeAddress(address) {
  const query = String(address || '').trim();
  if (!query) throw new Error('Escribe una dirección para buscar.');
  if (Platform.OS === 'web') throw new Error('La búsqueda por dirección está disponible en la app móvil. En web, marca el punto en el mapa si el mapa está habilitado.');
  if (Platform.OS === 'android') {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.status !== 'granted') throw new Error('Android requiere permiso de ubicación para buscar direcciones.');
    }
  }
  const results = await Location.geocodeAsync(query);
  if (!results.length) throw new Error('No encontramos esa dirección. Prueba con calle y comuna.');
  return results.map(({ latitude, longitude }) => ({ latitud: latitude, longitud: longitude }));
}

export async function watchCurrentLocation(onLocation) {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('No hay permiso de ubicación. Autoriza el GPS para continuar.');
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 20,
    },
    onLocation,
  );
}

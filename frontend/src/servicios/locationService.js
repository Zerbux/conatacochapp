import * as Location from 'expo-location';

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

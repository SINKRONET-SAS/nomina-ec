// ============================================================
// PLAN HAIKY - Servicio de GeolocalizaciÃ³n (App MÃ³vil)
// ============================================================
import * as Location from 'expo-location';

export async function obtenerUbicacionActual() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permiso de ubicaciÃ³n denegado');
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      precision: location.coords.accuracy,
    };
  } catch (err) {
    console.error('Error obteniendo ubicaciÃ³n:', err);
    throw err;
  }
}

export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const Ï†1 = lat1 * Math.PI / 180;
  const Ï†2 = lat2 * Math.PI / 180;
  const Î”Ï† = (lat2 - lat1) * Math.PI / 180;
  const Î”Î» = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Î”Ï†/2) * Math.sin(Î”Ï†/2) +
            Math.cos(Ï†1) * Math.cos(Ï†2) *
            Math.sin(Î”Î»/2) * Math.sin(Î”Î»/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // en metros
}


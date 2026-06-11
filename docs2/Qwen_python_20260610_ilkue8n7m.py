# Crear pantalla MisMarcaciones y servicios
mis_marcaciones_screen = '''// ============================================================
// PLAN HAIKY - Pantalla Mis Marcaciones (App Móvil)
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://10.0.2.2:3000/api';

export default function MisMarcacionesScreen() {
  const [marcaciones, setMarcaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarMarcaciones();
  }, []);

  const cargarMarcaciones = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const response = await axios.get(`${API_URL}/marcaciones/empleado/${payload.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMarcaciones(response.data.marcaciones || []);
    } catch (err) {
      console.error('Error cargando marcaciones:', err);
    } finally {
      setCargando(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarMarcaciones();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.tipo}>
          {item.tipo_marcacion.replace('_', ' ').toUpperCase()}
        </Text>
        <View style={[styles.badge, item.es_valida ? styles.badgeValid : styles.badgeInvalid]}>
          <Text style={styles.badgeText}>
            {item.es_valida ? 'VÁLIDA' : 'INVÁLIDA'}
          </Text>
        </View>
      </View>
      <Text style={styles.fecha}>
        {new Date(item.timestamp).toLocaleString('es-EC')}
      </Text>
      {item.distancia_metros && (
        <Text style={styles.distancia}>
          Distancia: {parseInt(item.distancia_metros)}m
        </Text>
      )}
      {item.foto_url && (
        <Text style={styles.foto}>📷 Foto adjunta</Text>
      )}
    </View>
  );

  if (cargando) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Cargando marcaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Marcaciones</Text>
      
      <FlatList
        data={marcaciones}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No hay marcaciones registradas</Text>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 50,
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  tipo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeValid: {
    backgroundColor: '#d1fae5',
  },
  badgeInvalid: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fecha: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
  distancia: {
    fontSize: 12,
    color: '#6b7280',
  },
  foto: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 50,
  },
});
'''

with open('app-movil/src/screens/MisMarcacionesScreen.js', 'w') as f:
    f.write(mis_marcaciones_screen)

# Crear servicios de la app móvil
api_service = '''// ============================================================
// PLAN HAIKY - Servicio API (App Móvil)
// ============================================================
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://10.0.2.2:3000/api'; // Android emulator
// const API_URL = 'http://localhost:3000/api'; // iOS simulator

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor para agregar token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      // Redirigir a login
    }
    return Promise.reject(error);
  }
);

export default api;
'''

with open('app-movil/src/services/api.js', 'w') as f:
    f.write(api_service)

geolocation_service = '''// ============================================================
// PLAN HAIKY - Servicio de Geolocalización (App Móvil)
// ============================================================
import * as Location from 'expo-location';

export async function obtenerUbicacionActual() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permiso de ubicación denegado');
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
    console.error('Error obteniendo ubicación:', err);
    throw err;
  }
}

export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // en metros
}
'''

with open('app-movil/src/services/geolocation.js', 'w') as f:
    f.write(geolocation_service)

camera_service = '''// ============================================================
// PLAN HAIKY - Servicio de Cámara (App Móvil)
// ============================================================
import { Camera } from 'expo-camera';

export async function solicitarPermisoCamara() {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function tomarFoto(cameraRef) {
  if (!cameraRef) throw new Error('Cámara no disponible');
  
  const photo = await cameraRef.takePictureAsync({
    quality: 0.5,
    base64: true,
    skipProcessing: true,
  });
  
  return {
    uri: photo.uri,
    base64: photo.base64,
    width: photo.width,
    height: photo.height,
  };
}
'''

with open('app-movil/src/services/camera.js', 'w') as f:
    f.write(camera_service)

print("✓ Pantalla MisMarcaciones y servicios de la app móvil creados")
 # Result 
✓ Pantalla MisMarcaciones y servicios de la app móvil creados

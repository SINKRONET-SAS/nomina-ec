// ============================================================
// PLAN HAIKY - Pantalla de Marcación (App Móvil)
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://10.0.2.2:3000/api';

export default function MarcacionScreen() {
  const [ubicacion, setUbicacion] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);
  const [tienePermisoCamara, setTienePermisoCamara] = useState(null);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [camara, setCamara] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [ultimaMarcacion, setUltimaMarcacion] = useState(null);

  useEffect(() => {
    solicitarPermisos();
    cargarUltimaMarcacion();
  }, []);

  const solicitarPermisos = async () => {
    // Permiso de ubicación
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicación para marcar asistencia');
      return;
    }
    
    // Permiso de cámara
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    setTienePermisoCamara(cameraStatus === 'granted');
    
    // Obtener ubicación actual
    obtenerUbicacion();
  };

  const obtenerUbicacion = async () => {
    setCargandoUbicacion(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUbicacion({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (err) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    } finally {
      setCargandoUbicacion(false);
    }
  };

  const cargarUltimaMarcacion = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      // Decodificar token para obtener empleadoId (simplificado)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const response = await axios.get(`${API_URL}/marcaciones/empleado/${payload.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.marcaciones.length > 0) {
        setUltimaMarcacion(response.data.marcaciones[0]);
      }
    } catch (err) {
      console.error('Error cargando última marcación:', err);
    }
  };

  const tomarFoto = async () => {
    if (camara) {
      const photo = await camara.takePictureAsync({
        quality: 0.5,
        base64: true,
      });
      return photo.base64;
    }
    return null;
  };

  const registrarMarcacion = async (tipo) => {
    if (!ubicacion) {
      Alert.alert('Error', 'Ubicación no disponible. Intente nuevamente.');
      return;
    }
    
    setCargando(true);
    
    try {
      // Tomar foto si es inicio de jornada
      let fotoBase64 = null;
      if (tipo === 'inicio_jornada' && tienePermisoCamara) {
        setMostrarCamara(true);
        // Esperar a que el usuario tome la foto
        await new Promise(resolve => setTimeout(resolve, 100));
        fotoBase64 = await tomarFoto();
        setMostrarCamara(false);
      }
      
      const token = await SecureStore.getItemAsync('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const response = await axios.post(`${API_URL}/marcaciones`, {
        empleadoId: payload.userId,
        tipo,
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        fotoBase64,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Éxito', `Marcación registrada: ${tipo.replace('_', ' ')}`);
      setUltimaMarcacion(response.data.marcacion);
      
      // Actualizar ubicación
      obtenerUbicacion();
      
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Error al registrar marcación');
    } finally {
      setCargando(false);
    }
  };

  const puedeMarcarInicio = !ultimaMarcacion || ultimaMarcacion.tipo_marcacion === 'fin_jornada';
  const puedeMarcarFin = ultimaMarcacion && ultimaMarcacion.tipo_marcacion === 'inicio_jornada';

  if (mostrarCamara && tienePermisoCamara) {
    return (
      <View style={styles.cameraContainer}>
        <Camera style={styles.camera} ref={ref => setCamara(ref)}>
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraText}>Tome una foto para validar su marcación</Text>
            <TouchableOpacity style={styles.captureButton} onPress={() => setMostrarCamara(false)}>
              <Text style={styles.captureButtonText}>Tomar Foto</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marcación de Asistencia</Text>
      
      {cargandoUbicacion ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
        </View>
      ) : ubicacion ? (
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Ubicación actual:</Text>
          <Text style={styles.infoValue}>
            Lat: {ubicacion.lat.toFixed(6)}, Lng: {ubicacion.lng.toFixed(6)}
          </Text>
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo obtener la ubicación</Text>
          <TouchableOpacity onPress={obtenerUbicacion} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonStart, !puedeMarcarInicio && styles.buttonDisabled]}
          onPress={() => registrarMarcacion('inicio_jornada')}
          disabled={!puedeMarcarInicio || cargando || !ubicacion}
        >
          <Text style={styles.buttonText}>
            {cargando ? 'Procesando...' : 'INICIAR JORNADA'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonEnd, !puedeMarcarFin && styles.buttonDisabled]}
          onPress={() => registrarMarcacion('fin_jornada')}
          disabled={!puedeMarcarFin || cargando || !ubicacion}
        >
          <Text style={styles.buttonText}>
            {cargando ? 'Procesando...' : 'FINALIZAR JORNADA'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {ultimaMarcacion && (
        <View style={styles.lastMarkContainer}>
          <Text style={styles.lastMarkLabel}>Última marcación:</Text>
          <Text style={styles.lastMarkValue}>
            {ultimaMarcacion.tipo_marcacion.replace('_', ' ')} -{' '}
            {new Date(ultimaMarcacion.timestamp).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#1f2937',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonsContainer: {
    gap: 15,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonStart: {
    backgroundColor: '#10b981',
  },
  buttonEnd: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastMarkContainer: {
    marginTop: 30,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  lastMarkLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  lastMarkValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cameraText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  captureButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


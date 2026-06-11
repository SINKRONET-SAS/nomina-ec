// ============================================================
// PLAN HAIKY - Pantalla de Login (App Móvil)
// ============================================================
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:3000/api'; // Android emulator

export default function LoginScreen({ onLogin }) {
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!cedula || !pin) {
      Alert.alert('Error', 'Ingrese cédula y PIN');
      return;
    }
    
    setCargando(true);
    try {
      // En producción, usar endpoint específico para empleados
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: `${cedula}@empresa.com`,
        password: pin
      });
      
      onLogin(response.data.token);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Credenciales inválidas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Plan Haiky</Text>
        <Text style={styles.subtitle}>App de Marcación</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Cédula"
          value={cedula}
          onChangeText={setCedula}
          keyboardType="number-pad"
          maxLength={10}
        />
        
        <TextInput
          style={styles.input}
          placeholder="PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          maxLength={6}
        />
        
        <TouchableOpacity
          style={[styles.button, cargando && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2563eb',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


// Nómina-Ec - App móvil (React Native + Expo)
// App.js - Componente principal
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import LoginScreen from './screens/LoginScreen';
import MarcacionScreen from './screens/MarcacionScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarToken();
  }, []);

  const cargarToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      setToken(storedToken);
    } catch (err) {
      console.error('Error cargando token:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleLogin = async (newToken) => {
    if (!newToken || typeof newToken !== 'string') {
      throw new Error('La respuesta de autenticacion no incluyo un token valido.');
    }
    await SecureStore.setItemAsync('token', newToken);
    setToken(newToken);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
  };

  if (cargando) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator color="#0f766e" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {token ? <MarcacionScreen onLogout={handleLogout} /> : <LoginScreen onLogin={handleLogin} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
  },
});


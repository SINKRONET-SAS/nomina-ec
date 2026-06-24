// Nómina-Ec - App móvil (React Native + Expo)
// App.js - Componente principal
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import LoginScreen from './screens/LoginScreen';
import MarcacionScreen from './screens/MarcacionScreen';
import MisMarcacionesScreen from './screens/MisMarcacionesScreen';
import AutoservicioScreen from './screens/AutoservicioScreen';
import RutaHoyScreen from './screens/RutaHoyScreen';

const tabs = [
  { id: 'marcar', label: 'Marcar' },
  { id: 'ruta', label: 'Ruta' },
  { id: 'historial', label: 'Historial' },
  { id: 'perfil', label: 'Perfil' },
];

function EmployeeAppShell({ onLogout }) {
  const [activeTab, setActiveTab] = useState('marcar');

  const renderScreen = () => {
    if (activeTab === 'ruta') return <RutaHoyScreen />;
    if (activeTab === 'historial') return <MisMarcacionesScreen />;
    if (activeTab === 'perfil') return <AutoservicioScreen />;
    return <MarcacionScreen onLogout={onLogout} />;
  };

  return (
    <View style={styles.shell}>
      <View style={styles.content}>{renderScreen()}</View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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
      {token ? <EmployeeAppShell onLogout={handleLogout} /> : <LoginScreen onLogin={handleLogin} />}
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
  shell: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  tabButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  tabText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#ffffff',
  },
});


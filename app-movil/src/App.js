// SKNOMINA - App móvil (React Native + Expo)
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
import PermisosScreen from './screens/PermisosScreen';
import RutaHoyScreen from './screens/RutaHoyScreen';
import GastosMovilizacionScreen from './screens/GastosMovilizacionScreen';
import { initMovilizacionDB } from './db/movilizacion';
import { mobileAPI } from './services/api';

const storedUserKey = 'mobileUser';

const tabs = [
  { id: 'marcar', label: 'Marcar' },
  { id: 'ruta', label: 'Ruta' },
  { id: 'movilizacion', label: 'Moviliz.' },
  { id: 'permisos', label: 'Permisos' },
  { id: 'historial', label: 'Historial' },
  { id: 'autoservicio', label: 'Mi Nómina' },
];

function EmployeeAppShell({ onLogout }) {
  const [activeTab, setActiveTab] = useState('marcar');

  const renderScreen = () => {
    if (activeTab === 'ruta') return <RutaHoyScreen />;
    if (activeTab === 'movilizacion') return <GastosMovilizacionScreen />;
    if (activeTab === 'permisos') return <PermisosScreen />;
    if (activeTab === 'historial') return <MisMarcacionesScreen />;
    if (activeTab === 'autoservicio') return <AutoservicioScreen />;
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

function roleLabel(role) {
  const labels = {
    owner: 'Propietario',
    admin_rrhh: 'Administrador de RRHH',
    supervisor: 'Supervisor',
    superadmin: 'Superadmin',
    empleado: 'Empleado',
  };
  return labels[role] || 'Usuario';
}

function AdminMobileShell({ user, onLogout }) {
  return (
    <View style={styles.adminShell}>
      <View style={styles.adminCard}>
        <Text style={styles.adminEyebrow}>Acceso administrativo</Text>
        <Text style={styles.adminTitle}>SKNOMINA móvil</Text>
        <Text style={styles.adminText}>
          {roleLabel(user?.rol)}: tu acceso móvil queda reservado para revisar operación y confirmar que la app de empleados está disponible.
        </Text>
        <View style={styles.adminGrid}>
          <View style={styles.adminTile}>
            <Text style={styles.adminTileTitle}>Permisos</Text>
            <Text style={styles.adminTileText}>Los empleados pueden solicitar permisos desde la app.</Text>
          </View>
          <View style={styles.adminTile}>
            <Text style={styles.adminTileTitle}>Movilización</Text>
            <Text style={styles.adminTileText}>Los informes se aprueban desde la PWA de operación.</Text>
          </View>
          <View style={styles.adminTile}>
            <Text style={styles.adminTileTitle}>Rutas</Text>
            <Text style={styles.adminTileText}>El equipo registra entradas y salidas de campo en tiempo real.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MobileAccessNotice({ message, onLogout }) {
  return (
    <View style={styles.adminShell}>
      <View style={styles.adminCard}>
        <Text style={styles.adminEyebrow}>Acceso móvil</Text>
        <Text style={styles.adminTitle}>No pudimos abrir tu perfil operativo</Text>
        <Text style={styles.adminText}>{message}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [mobileProfile, setMobileProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarToken();
    initMovilizacionDB().catch((err) => {
      console.error('Error inicializando movilizacion local:', {
        code: err.code || 'MOVILIZACION_SQLITE_INIT_ERROR',
        statusCode: 500,
        correlationId: 'mobile-local',
        userId: null,
        message: err.message,
      });
    });
  }, []);

  const cargarToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync(storedUserKey);
      if (storedUser) {
        setAuthUser(JSON.parse(storedUser));
      }
      setToken(storedToken);
    } catch (err) {
      console.error('[MOBILE] No se pudo cargar la sesión local', {
        code: 'MOBILE_SESSION_LOAD_ERROR',
        statusCode: 500,
        correlationId: 'mobile-local',
        message: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarPerfilMovil = async (fallbackUser = authUser) => {
    setCargandoPerfil(true);
    setProfileError('');
    try {
      const response = await mobileAPI.me();
      const nextProfile = {
        employee: response.data?.employee || null,
        user: response.data?.user || fallbackUser || null,
      };
      setMobileProfile(nextProfile);
      if (nextProfile.user) {
        setAuthUser(nextProfile.user);
        await SecureStore.setItemAsync(storedUserKey, JSON.stringify(nextProfile.user));
      }
    } catch (err) {
      const role = fallbackUser?.rol;
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'PLAN_CAPABILITY_BLOCKED') {
        setMobileProfile(null);
        setProfileError(err?.response?.data?.message || 'El plan actual no incluye app movil. Activa un plan que ofrezca esta funcionalidad.');
      } else if (['owner', 'admin_rrhh', 'superadmin'].includes(role)) {
        setMobileProfile({ employee: null, user: fallbackUser, administrativeOnly: true });
        setProfileError('');
      } else {
        setMobileProfile(null);
        setProfileError(err?.response?.data?.message || err.message || 'No pudimos cargar tu perfil móvil.');
      }
    } finally {
      setCargandoPerfil(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarPerfilMovil();
    } else {
      setMobileProfile(null);
      setProfileError('');
      setCargandoPerfil(false);
    }
  }, [token]);

  const handleLogin = async (newToken, payload = {}) => {
    if (!newToken || typeof newToken !== 'string') {
      throw new Error('La respuesta de autenticación no incluyó un token válido.');
    }
    setCargandoPerfil(true);
    const nextUser = payload?.usuario || payload?.user || null;
    await SecureStore.setItemAsync('token', newToken);
    if (nextUser) {
      await SecureStore.setItemAsync(storedUserKey, JSON.stringify(nextUser));
      setAuthUser(nextUser);
    }
    setToken(newToken);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync(storedUserKey);
    setToken(null);
    setAuthUser(null);
    setMobileProfile(null);
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
      {token && cargandoPerfil && (
        <View style={styles.loading}>
          <ActivityIndicator color="#0f766e" size="large" />
          <Text style={styles.loadingText}>Abriendo tu perfil...</Text>
        </View>
      )}
      {token && !cargandoPerfil && profileError && (
        <MobileAccessNotice message={profileError} onLogout={handleLogout} />
      )}
      {token && !cargandoPerfil && !profileError && !mobileProfile && (
        <View style={styles.loading}>
          <ActivityIndicator color="#0f766e" size="large" />
          <Text style={styles.loadingText}>Preparando tu acceso...</Text>
        </View>
      )}
      {token && !cargandoPerfil && !profileError && mobileProfile && ['owner', 'admin_rrhh', 'superadmin'].includes(mobileProfile?.user?.rol) && (
        <AdminMobileShell user={mobileProfile.user} onLogout={handleLogout} />
      )}
      {token && !cargandoPerfil && !profileError && mobileProfile && !['owner', 'admin_rrhh', 'superadmin'].includes(mobileProfile?.user?.rol) && (
        <EmployeeAppShell onLogout={handleLogout} />
      )}
      {!token && <LoginScreen onLogin={handleLogin} />}
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
  loadingText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
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
    gap: 4,
    paddingBottom: 12,
    paddingHorizontal: 8,
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
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  adminShell: {
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  adminCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 12,
    borderWidth: 1,
    padding: 22,
  },
  adminEyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  adminTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  adminText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  adminGrid: {
    gap: 10,
    marginTop: 18,
  },
  adminTile: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 14,
  },
  adminTileTitle: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '900',
  },
  adminTileText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 20,
    minHeight: 46,
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});


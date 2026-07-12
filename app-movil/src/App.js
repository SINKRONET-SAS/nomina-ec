// SKNOMINA - App móvil (React Native + Expo)
// App.js - Componente principal
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import OperacionMovilScreen from './screens/OperacionMovilScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { initMovilizacionDB } from './db/movilizacion';
import { initOfflineQueue, processQueue } from './db/offline-queue';
import { initRouteCache } from './db/route-cache';
import {
  API_URL,
  clearMemoryAuthToken,
  mobileAPI,
  setMemoryAuthToken,
} from './services/api';

const storedUserKey = 'mobileUser';
const operationalAdminRoles = ['owner', 'admin_rrhh', 'supervisor'];
const administrativeNoticeRoles = [...operationalAdminRoles, 'superadmin'];

const tabs = [
  { id: 'marcar', label: 'Marcar' },
  { id: 'ruta', label: 'Ruta' },
  { id: 'movilizacion', label: 'Moviliz.' },
  { id: 'permisos', label: 'Permisos' },
  { id: 'autoservicio', label: 'Mi Nómina' },
];

function EmployeeAppShell({ onLogout }) {
  const [activeTab, setActiveTab] = useState('marcar');

  const renderScreen = () => {
    if (activeTab === 'ruta') return <RutaHoyScreen />;
    if (activeTab === 'movilizacion') return <GastosMovilizacionScreen />;
    if (activeTab === 'permisos') return <PermisosScreen />;
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
      <View style={styles.adminTopBar}>
        <View>
          <Text style={styles.adminEyebrow}>Acceso administrativo</Text>
          <Text style={styles.adminHeaderTitle}>{roleLabel(user?.rol)}</Text>
        </View>
        <TouchableOpacity style={styles.adminLogoutButton} onPress={onLogout}>
          <Text style={styles.adminLogoutButtonText}>Salir</Text>
        </TouchableOpacity>
      </View>
      <OperacionMovilScreen user={user} />
    </View>
  );
}

function MobileAccessNotice({ message, onLogout }) {
  return (
    <View style={styles.noticeShell}>
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
  const [isOnline, setIsOnline] = useState(true);
  const [sessionPersisted, setSessionPersisted] = useState(false);

  useEffect(() => {
    cargarToken();
    Promise.all([
      initMovilizacionDB(),
      initOfflineQueue(),
      initRouteCache(),
    ]).catch((err) => {
      console.error('Error inicializando SQLite local:', {
        code: err.code || 'SQLITE_INIT_ERROR',
        statusCode: 500,
        correlationId: 'mobile-local',
        userId: null,
        message: err.message,
      });
    });

    let mounted = true;

    const syncOfflineQueue = async () => {
      try {
        await fetch(API_URL, { method: 'HEAD' });
        if (!mounted) return;
        setIsOnline(true);
        await processQueue(mobileAPI);
      } catch (err) {
        if (!mounted) return;
        setIsOnline(false);
        console.error('[MOBILE] Error procesando cola offline', {
          code: err.code || 'MOBILE_OFFLINE_QUEUE_PROCESS_ERROR',
          statusCode: 500,
          correlationId: 'mobile-local',
          userId: null,
          message: err.message,
        });
      }
    };

    syncOfflineQueue();
    const interval = setInterval(syncOfflineQueue, 30000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncOfflineQueue();
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const cargarToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync(storedUserKey);
      if (storedUser) {
        setAuthUser(JSON.parse(storedUser));
      }
      setMemoryAuthToken(storedToken);
      setSessionPersisted(Boolean(storedToken));
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
        if (sessionPersisted) {
          await SecureStore.setItemAsync(storedUserKey, JSON.stringify(nextProfile.user));
        }
      }
    } catch (err) {
      const role = fallbackUser?.rol;
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'PLAN_CAPABILITY_BLOCKED') {
        setMobileProfile(null);
        setProfileError(err?.response?.data?.message || 'El plan actual no incluye app móvil. Activa un plan que ofrezca esta funcionalidad.');
      } else if (administrativeNoticeRoles.includes(role)) {
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

  const handleLogin = async (newToken, payload = {}, options = {}) => {
    if (!newToken || typeof newToken !== 'string') {
      throw new Error('La respuesta de autenticación no incluyó un token válido.');
    }
    setCargandoPerfil(true);
    const nextUser = payload?.usuario || payload?.user || null;
    const persistLocal = options.persistLocal !== false;
    try {
      if (persistLocal) {
        await SecureStore.setItemAsync('token', newToken);
        if (nextUser) {
          await SecureStore.setItemAsync(storedUserKey, JSON.stringify(nextUser));
        } else {
          await SecureStore.deleteItemAsync(storedUserKey);
        }
      } else {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync(storedUserKey);
      }
    } catch (err) {
      clearMemoryAuthToken();
      setCargandoPerfil(false);
      setSessionPersisted(false);
      for (const key of ['token', storedUserKey]) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (cleanupErr) {
          console.error('[MOBILE] No se pudo limpiar la sesion local tras fallo de almacenamiento', {
            code: 'SESSION_CLEANUP_FAILED',
            statusCode: 500,
            correlationId: 'mobile-login-storage',
            userId: null,
            key,
            message: cleanupErr.message,
          });
        }
      }
      const storageError = new Error('No se pudo guardar la sesión local. Intenta nuevamente.');
      storageError.code = 'SESSION_PERSIST_FAILED';
      storageError.cause = err;
      throw storageError;
    }

    setMemoryAuthToken(newToken);
    setSessionPersisted(persistLocal);
    if (nextUser) {
      setAuthUser(nextUser);
    }
    setToken(newToken);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync(storedUserKey);
    clearMemoryAuthToken();
    setSessionPersisted(false);
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
    <ErrorBoundary>
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {token && !cargando && (
        <View style={[styles.connectivityBar, isOnline ? styles.onlineBar : styles.offlineBar]}>
          <Text style={styles.connectivityText}>{isOnline ? 'En línea' : 'Sin conexión — datos locales'}</Text>
        </View>
      )}
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
      {token && !cargandoPerfil && !profileError && mobileProfile && operationalAdminRoles.includes(mobileProfile?.user?.rol) && (
        <AdminMobileShell user={mobileProfile.user} onLogout={handleLogout} />
      )}
      {token && !cargandoPerfil && !profileError && mobileProfile && mobileProfile?.user?.rol === 'superadmin' && (
        <MobileAccessNotice
          message="El superadmin gestiona planes y tenant desde la PWA. Usa un usuario owner, RRHH o supervisor para operar rutas desde la app."
          onLogout={handleLogout}
        />
      )}
      {token && !cargandoPerfil && !profileError && mobileProfile && !administrativeNoticeRoles.includes(mobileProfile?.user?.rol) && (
        <EmployeeAppShell onLogout={handleLogout} />
      )}
      {!token && <LoginScreen onLogin={handleLogin} />}
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  connectivityBar: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  connectivityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  onlineBar: {
    backgroundColor: '#16a34a',
  },
  offlineBar: {
    backgroundColor: '#d97706',
  },
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
  },
  noticeShell: {
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  adminTopBar: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 16,
  },
  adminCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 8,
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
  adminHeaderTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  adminText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  adminLogoutButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  adminLogoutButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
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


import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../services/apiBase';
import {
  clearStoredAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
  isStoredSessionPersistent,
  storeAuthSession,
} from '../services/authStorage';

const AuthContext = createContext(null);

function normalizeUser(payload) {
  const user = payload?.usuario || payload?.user || null;
  if (!user) return null;
  return {
    ...user,
    rol: String(user.rol || '').trim().toLowerCase(),
  };
}

function normalizeAuthError(data) {
  const code = data?.error || data?.code;
  const mapped = {
    AUTH_CREDENCIALES_INVALIDAS: 'Credenciales inválidas. Verifica el correo y la contraseña.',
    AUTH_EMAIL_NO_VERIFICADO: 'Correo no verificado. Revisa tu bandeja o solicita un nuevo código.',
    TENANT_SUSPENDIDO: 'La empresa está suspendida. Contacta al administrador o soporte.',
    PLAN_VENCIDO: 'El plan está vencido. Actualiza la suscripción para continuar.',
    REGISTRO_CONSENTIMIENTO_REQUERIDO: 'Debes aceptar términos, privacidad y tratamiento de datos para crear la empresa.',
  };

  return {
    ...(data || {}),
    message: mapped[code] || data?.message || 'No se pudo completar la autenticación.',
  };
}

function readStoredUser() {
  try {
    const raw = getStoredAuthUser();
    return raw ? normalizeUser({ usuario: JSON.parse(raw) }) : null;
  } catch (err) {
    console.error('[AUTH] No se pudo leer usuario local', {
      message: err.message,
    });
    clearStoredAuthSession();
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(readStoredUser);
  const [token, setToken] = useState(getStoredAuthToken);
  const [cargando, setCargando] = useState(true);
  const refreshStarted = useRef(false);

  const logout = () => {
    setToken(null);
    setUsuario(null);
    clearStoredAuthSession();
    delete axios.defaults.headers.common.Authorization;
  };

  const setSessionFromPayload = (payload, options = {}) => {
    const nextToken = payload?.token;
    const nextUser = normalizeUser(payload);

    if (!nextToken || !nextUser) {
      throw new Error('Respuesta de autenticación inválida.');
    }

    try {
      storeAuthSession(nextToken, nextUser, {
        persistLocal: options.persistLocal !== false,
      });
    } catch (err) {
      clearStoredAuthSession();
      const storageError = new Error('No se pudo guardar la sesión en este equipo. Revisa la configuración de privacidad del navegador.');
      storageError.code = 'AUTH_SESSION_STORAGE_FAILED';
      storageError.cause = err;
      throw storageError;
    }

    setToken(nextToken);
    setUsuario(nextUser);
    axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
    return nextUser;
  };

  useEffect(() => {
    if (refreshStarted.current) return;
    refreshStarted.current = true;

    const storedToken = getStoredAuthToken();
    const persistLocal = isStoredSessionPersistent();

    if (!storedToken) {
      setCargando(false);
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    axios.post(`${API_URL}/auth/refresh`, { token: storedToken })
      .then((response) => setSessionFromPayload(response.data, { persistLocal }))
      .catch((err) => {
        console.error('[AUTH] No se pudo refrescar sesión', {
          code: err?.response?.data?.error || 'AUTH_REFRESH_FAILED',
          message: err?.response?.data?.message || err.message,
        });
        logout();
      })
      .finally(() => setCargando(false));
  }, []);

  const login = async (email, password, tenantRuc = '', tenantId = '', options = {}) => {
    try {
      const payload = { email, password };
      if (String(tenantRuc || '').trim()) {
        payload.tenantRuc = String(tenantRuc).trim();
      }
      if (String(tenantId || '').trim()) {
        payload.tenantId = String(tenantId).trim();
      }
      const response = await axios.post(`${API_URL}/auth/login`, payload);
      setSessionFromPayload(response.data, {
        persistLocal: options.persistLocal !== false,
      });
      return response.data;
    } catch (err) {
      if (err.code === 'AUTH_SESSION_STORAGE_FAILED') {
        throw err;
      }
      throw normalizeAuthError(err.response?.data || {
        error: 'Error de conexión',
        message: 'No se pudo conectar con SKNOMINA.',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, logout, setSessionFromPayload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}


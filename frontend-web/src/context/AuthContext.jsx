import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../services/apiBase';

const AuthContext = createContext(null);

function normalizeUser(payload) {
  return payload?.usuario || payload?.user || null;
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
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[AUTH] No se pudo leer usuario local', {
      message: err.message,
    });
    localStorage.removeItem('usuario');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(readStoredUser);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cargando, setCargando] = useState(true);

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    delete axios.defaults.headers.common.Authorization;
  };

  const setSessionFromPayload = (payload) => {
    const nextToken = payload?.token;
    const nextUser = normalizeUser(payload);

    if (!nextToken || !nextUser) {
      throw new Error('Respuesta de autenticación inválida.');
    }

    setToken(nextToken);
    setUsuario(nextUser);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('usuario', JSON.stringify(nextUser));
    axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
    return nextUser;
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      console.log('[AUTH] No existe token local para refrescar sesión.');
      setCargando(false);
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    axios.post(`${API_URL}/auth/refresh`, { token: storedToken })
      .then((response) => setSessionFromPayload(response.data))
      .catch((err) => {
        console.error('[AUTH] No se pudo refrescar sesión', {
          code: err?.response?.data?.error || 'AUTH_REFRESH_FAILED',
          message: err?.response?.data?.message || err.message,
        });
        logout();
      })
      .finally(() => setCargando(false));
  }, []);

  const login = async (email, password, tenantRuc = '') => {
    try {
      const payload = { email, password };
      if (String(tenantRuc || '').trim()) {
        payload.tenantRuc = String(tenantRuc).trim();
      }
      const response = await axios.post(`${API_URL}/auth/login`, payload);
      setSessionFromPayload(response.data);
      return response.data;
    } catch (err) {
      throw normalizeAuthError(err.response?.data || {
        error: 'Error de conexión',
        message: 'No se pudo conectar con Nómina-Ec.',
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


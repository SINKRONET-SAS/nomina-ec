import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_URL = 'https://api.sknomina.com/api';

function normalizeApiUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL);
export const IS_LOCAL_API_URL = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password, tenantRuc = '') => {
    const payload = { email, password };
    if (String(tenantRuc || '').trim()) {
      payload.tenantRuc = String(tenantRuc).trim();
    }
    return api.post('/auth/login', payload);
  },
  activateEmployee: (payload) => api.post('/mobile/empleado/activar', payload),
  forgotPassword: (email) => api.post('/auth/password/forgot', { email }),
  resetPassword: (payload) => api.post('/auth/password/reset', payload),
};

export const mobileAPI = {
  me: () => api.get('/mobile/me'),
  attendanceSummary: () => api.get('/mobile/asistencia/resumen'),
  registerMark: (payload) => api.post('/mobile/marcaciones', payload),
  routeToday: () => api.get('/mobile/ruta/hoy'),
  routeArrival: (stopId, payload) => api.post(`/mobile/ruta/paradas/${stopId}/llegada`, payload),
  routeDeparture: (stopId, payload) => api.post(`/mobile/ruta/paradas/${stopId}/salida`, payload),
  routeOmit: (stopId, payload) => api.post(`/mobile/ruta/paradas/${stopId}/omitir`, payload),
  routeUnplanned: (payload) => api.post('/mobile/ruta/visitas/no-programada', payload),
  adminRoutesSummary: (fecha) => api.get('/mobile/admin/rutas/resumen', { params: fecha ? { fecha } : {} }),
  adminCreateWorkZone: (payload) => api.post('/mobile/admin/zonas', payload),
  adminCreateRouteSite: (payload) => api.post('/mobile/admin/rutas/sitios', payload),
  adminAssignRoute: (payload) => api.post('/mobile/admin/rutas/dias', payload),
  payroll: (anio, mes) => api.get(`/mobile/nomina/${anio}/${mes}`),
  payrollPdf: (nominaId) => api.get(`/nomina/${nominaId}/rol-pdf`),
  history: () => api.get('/mobile/historial'),
  requestPermission: (payload) => api.post('/mobile/permisos', payload),
  sendMobilizationReport: (payload) => api.post('/movilizacion/informe', payload),
  mobilizationReports: () => api.get('/movilizacion/mis-informes'),
};

export default api;

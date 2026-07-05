import axios from 'axios';
import { API_URL } from './apiBase';
import { sanitizeApiErrorMessage } from './publicApi';

export const authenticatedApi = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

authenticatedApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

authenticatedApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') {
        data.message = sanitizeApiErrorMessage(data.message);
      } else if (typeof data.error === 'string') {
        const sanitized = sanitizeApiErrorMessage(data.error, data.error);
        if (sanitized !== data.error) {
          data.message = sanitized;
        }
      }
    }

    const status = error?.response?.status;
    const errorCode = error?.response?.data?.error || error?.response?.data?.code;
    const sessionRejected = status === 401 || (status === 403 && ['TOKEN_INVALIDO', 'TOKEN_EXPIRADO'].includes(errorCode));

    if (sessionRejected) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new CustomEvent('nomina-auth-expired'));
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

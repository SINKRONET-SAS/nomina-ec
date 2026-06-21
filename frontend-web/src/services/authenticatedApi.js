import axios from 'axios';
import { API_URL } from './apiBase';

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
    if (error?.response?.status === 401) {
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

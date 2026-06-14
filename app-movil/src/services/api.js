import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';

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
  login: (email, password) => api.post('/auth/login', { email, password }),
  publicRegister: (payload) => api.post('/auth/public-register', payload),
  forgotPassword: (email) => api.post('/auth/password/forgot', { email }),
  resetPassword: (payload) => api.post('/auth/password/reset', payload),
};

export const paymentAPI = {
  plans: () => api.get('/pagos/planes'),
  startCheckout: (planId) => api.post('/pagos/payment-methods/checkout-intent', { planId }),
};

export default api;

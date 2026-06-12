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

import axios from 'axios';
import { API_URL } from './apiBase';

export const publicApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export function sanitizeApiErrorMessage(message, fallback = 'No se pudo completar la operación.') {
  const normalized = String(message || '').trim().toLowerCase();

  if (normalized.includes('could not load credentials') || normalized.includes('error al subir archivo a s3')) {
    return 'El almacenamiento documental no está configurado. Solicita revisar las credenciales S3 antes de generar documentos.';
  }

  if (normalized === 'ruta no encontrada' || normalized === 'not_found') {
    return 'No pudimos cargar esta sección. Actualiza la página y verifica que el servicio esté activo.';
  }

  return message || fallback;
}

export function extractApiError(err, fallback = 'No se pudo completar la operación.') {
  const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
  return sanitizeApiErrorMessage(message, fallback);
}

export async function fetchPlans() {
  const response = await publicApi.get('/pagos/planes');
  return {
    plans: response.data?.data || [],
    paymentCapabilities: response.data?.paymentCapabilities || null,
  };
}

export async function publicRegister(payload) {
  const response = await publicApi.post('/auth/public-register', payload);
  return response.data;
}

export async function forgotPassword(email) {
  const response = await publicApi.post('/auth/password/forgot', { email });
  return response.data;
}

export async function resetPassword(payload) {
  const response = await publicApi.post('/auth/password/reset', payload);
  return response.data;
}

export async function requestEmailVerification(email) {
  const response = await publicApi.post('/auth/email-verification/request', { email });
  return response.data;
}

export async function confirmEmailVerification(payload) {
  const response = await publicApi.post('/auth/email-verification/confirm', payload);
  return response.data;
}

export async function startCheckout(token, planId) {
  const response = await publicApi.post(
    '/pagos/payment-methods/checkout-intent',
    { planId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data?.data;
}

import axios from 'axios';
import { API_URL } from './apiBase';

export const publicApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export function extractApiError(err, fallback = 'No se pudo completar la operación.') {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

export async function fetchPlans() {
  const response = await publicApi.get('/pagos/planes');
  return response.data?.data || [];
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

export async function startCheckout(token, planId) {
  const response = await publicApi.post(
    '/pagos/payment-methods/checkout-intent',
    { planId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data?.data;
}

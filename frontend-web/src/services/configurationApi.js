import axios from 'axios';
import { API_URL } from './apiBase';

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function fetchConfigurationSummary(token) {
  const response = await axios.get(`${API_URL}/configuracion/resumen`, authHeaders(token));
  return response.data?.data;
}

export async function createConfigurationResource(token, resource, payload) {
  const response = await axios.post(`${API_URL}/configuracion/${resource}`, payload, authHeaders(token));
  return response.data?.data;
}

export async function completeOnboardingStep(token, stepCode, payload = {}) {
  const response = await axios.post(`${API_URL}/configuracion/onboarding/${stepCode}`, payload, authHeaders(token));
  return response.data?.data;
}

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

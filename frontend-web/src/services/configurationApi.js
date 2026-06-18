import { authenticatedApi } from './authenticatedApi';

export async function fetchConfigurationSummary() {
  const response = await authenticatedApi.get('/configuracion/resumen');
  return response.data?.data;
}

export async function createConfigurationResource(_token, resource, payload) {
  const response = await authenticatedApi.post(`/configuracion/${resource}`, payload);
  return response.data?.data;
}

export async function loadMandatoryLegalParameters(_token, year) {
  const response = await authenticatedApi.post('/configuracion/parametros-legales/obligatorios', { year });
  return response.data?.data;
}

export async function completeOnboardingStep(_token, stepCode, payload = {}) {
  const response = await authenticatedApi.post(`/configuracion/onboarding/${stepCode}`, payload);
  return response.data?.data;
}

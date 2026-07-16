import { authenticatedApi } from './authenticatedApi';

export async function fetchConfigurationSummary() {
  const response = await authenticatedApi.get('/configuracion/resumen');
  return response.data?.data;
}

export async function createConfigurationResource(_token, resource, payload) {
  const response = await authenticatedApi.post(`/configuracion/${resource}`, payload);
  return response.data?.data;
}

export async function updateConfigurationResource(_token, resource, id, payload) {
  const response = await authenticatedApi.put(`/configuracion/${resource}/${id}`, payload);
  return response.data?.data;
}

export async function deleteConfigurationResource(_token, resource, id) {
  const response = await authenticatedApi.delete(`/configuracion/${resource}/${id}`);
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

export async function generateBankPaymentFile(_token, payload) {
  const response = await authenticatedApi.post('/reportes/banco', payload);
  return response.data?.reporte;
}

export async function uploadTenantLogo(logoBase64) {
  const response = await authenticatedApi.put('/configuracion/logo', { logoBase64 });
  return response.data?.data;
}

export async function removeTenantLogo() {
  const response = await authenticatedApi.delete('/configuracion/logo');
  return response.data?.data;
}

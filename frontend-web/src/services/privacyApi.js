import { authenticatedApi } from './authenticatedApi';

export async function fetchPrivacyStatus() {
  const response = await authenticatedApi.get('/privacidad/consentimientos');
  return response.data?.data;
}

export async function updatePrivacyConsents(preferences) {
  const response = await authenticatedApi.patch('/privacidad/consentimientos', { preferences });
  return response.data?.data;
}

export async function withdrawAllOptionalConsents() {
  const response = await authenticatedApi.post('/privacidad/consentimientos/retirar-todo');
  return response.data?.data;
}

export async function fetchConsentHistory() {
  const response = await authenticatedApi.get('/privacidad/consentimientos/historial');
  return response.data?.data || [];
}

export async function exportPrivacyData() {
  const response = await authenticatedApi.get('/privacidad/exportar');
  return response.data?.data;
}

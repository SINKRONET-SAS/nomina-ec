import { authenticatedApi } from './authenticatedApi';

export async function fetchSuperadminOverview() {
  const response = await authenticatedApi.get('/superadmin/overview');
  return response.data?.data;
}

export async function createSupportIncident(payload) {
  const response = await authenticatedApi.post('/superadmin/incidencias', payload);
  return response.data?.data;
}

export async function updateSupportIncident(id, status) {
  const response = await authenticatedApi.put(`/superadmin/incidencias/${id}`, { status });
  return response.data?.data;
}

export async function fetchManualBankTransfers(params = {}) {
  const response = await authenticatedApi.get('/pagos/transferencias/admin', { params });
  return response.data?.data?.items || [];
}

export async function createManualBankTransfer(payload) {
  const response = await authenticatedApi.post('/pagos/transferencias', payload);
  return response.data?.data;
}

export async function confirmManualBankTransfer(id) {
  const response = await authenticatedApi.post(`/pagos/transferencias/${id}/confirmar`);
  return response.data?.data;
}

export async function applyManualBankTransfer(id, payload = {}) {
  const response = await authenticatedApi.post(`/pagos/transferencias/${id}/aplicar`, payload);
  return response.data?.data;
}

export async function rejectManualBankTransfer(id, payload = {}) {
  const response = await authenticatedApi.post(`/pagos/transferencias/${id}/rechazar`, payload);
  return response.data?.data;
}

export async function reverseManualBankTransfer(id, payload = {}) {
  const response = await authenticatedApi.post(`/pagos/transferencias/${id}/reversar`, payload);
  return response.data?.data;
}

import { authenticatedApi } from './authenticatedApi';

export async function fetchAdvanceRoles(params = {}) {
  const response = await authenticatedApi.get('/nomina/anticipos/roles', { params });
  return response.data?.roles || [];
}

export async function createAdvanceRole(payload) {
  const response = await authenticatedApi.post('/nomina/anticipos/roles', payload);
  return response.data?.role;
}

export async function approveAdvanceRole(id) {
  const response = await authenticatedApi.put(`/nomina/anticipos/roles/${id}/aprobar`);
  return response.data?.role;
}

export async function decideAdvanceLine(roleId, lineId, decision) {
  const response = await authenticatedApi.put(`/nomina/anticipos/roles/${roleId}/lineas/${lineId}/decidir`, { decision });
  return response.data?.role;
}

export async function closeAdvanceRole(id) {
  const response = await authenticatedApi.put(`/nomina/anticipos/roles/${id}/cerrar`);
  return response.data?.role;
}

export async function downloadAdvanceRoleCsv(id) {
  const response = await authenticatedApi.get(`/nomina/anticipos/roles/${id}.csv`, { responseType: 'blob' });
  return response.data;
}

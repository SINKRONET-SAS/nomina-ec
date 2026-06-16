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

import { authenticatedApi } from './authenticatedApi';

export async function fetchApiClients() {
  const response = await authenticatedApi.get('/integraciones/clientes');
  return response.data?.data || [];
}

export async function createApiClient(payload) {
  const response = await authenticatedApi.post('/integraciones/clientes', payload);
  return response.data;
}

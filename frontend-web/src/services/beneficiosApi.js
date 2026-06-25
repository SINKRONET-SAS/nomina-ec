import { authenticatedApi } from './authenticatedApi';

export async function fetchBeneficios(params = {}) {
  const response = await authenticatedApi.get('/beneficios', { params });
  return response.data?.beneficios || [];
}

export async function createBeneficio(payload) {
  const response = await authenticatedApi.post('/beneficios', payload);
  return response.data?.beneficio;
}

export async function updateBeneficio(id, payload) {
  const response = await authenticatedApi.put(`/beneficios/${id}`, payload);
  return response.data?.beneficio;
}

export async function fetchPlanCapabilities() {
  const response = await authenticatedApi.get('/pagos/capabilities');
  return response.data?.data;
}

export async function fetchAdminPlans() {
  const response = await authenticatedApi.get('/pagos/planes/admin');
  return response.data?.data || [];
}

export async function saveAdminPlan(payload) {
  const method = payload.existing ? 'put' : 'post';
  const url = payload.existing ? `/pagos/planes/${payload.id}` : '/pagos/planes';
  const response = await authenticatedApi[method](url, payload);
  return response.data;
}

export async function deactivateAdminPlan(planId) {
  const response = await authenticatedApi.delete(`/pagos/planes/${planId}`);
  return response.data;
}

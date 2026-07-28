import { authenticatedApi } from './authenticatedApi';

export async function fetchBenefitPayrollRoles(params = {}) {
  const response = await authenticatedApi.get('/nomina/roles-beneficios', { params });
  return response.data?.roles || [];
}

export async function createBenefitPayrollRole(payload) {
  const response = await authenticatedApi.post('/nomina/roles-beneficios', payload);
  return response.data?.role;
}

export async function approveBenefitPayrollRole(id) {
  const response = await authenticatedApi.put(`/nomina/roles-beneficios/${id}/aprobar`);
  return response.data?.role;
}

export async function closeBenefitPayrollRole(id) {
  const response = await authenticatedApi.put(`/nomina/roles-beneficios/${id}/cerrar`);
  return response.data?.role;
}

export async function downloadBenefitPayrollFile(id, format = 'xlsx') {
  const response = await authenticatedApi.get(`/nomina/roles-beneficios/${id}.${format}`, { responseType: 'blob' });
  return response.data;
}

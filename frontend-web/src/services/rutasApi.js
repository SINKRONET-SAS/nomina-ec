import { authenticatedApi } from './authenticatedApi';

export async function fetchRouteSites() {
  const response = await authenticatedApi.get('/rutas/sitios');
  return response.data.sites || [];
}

export async function saveRouteSite(payload, id = null) {
  const response = id
    ? await authenticatedApi.put(`/rutas/sitios/${id}`, payload)
    : await authenticatedApi.post('/rutas/sitios', payload);
  return response.data.site;
}

export async function deleteRouteSite(id) {
  const response = await authenticatedApi.delete(`/rutas/sitios/${id}`);
  return response.data.result;
}

export async function fetchRouteDays(params = {}) {
  const response = await authenticatedApi.get('/rutas/dias', { params });
  return response.data.days || [];
}

export async function createRouteDay(payload) {
  const response = await authenticatedApi.post('/rutas/dias', payload);
  return response.data.route;
}

export async function fetchRouteExceptions(params = {}) {
  const response = await authenticatedApi.get('/rutas/excepciones', { params });
  return response.data.exceptions || [];
}

export async function reviewRouteException(id, payload) {
  const response = await authenticatedApi.put(`/rutas/excepciones/${id}`, payload);
  return response.data.exception;
}

export async function downloadRouteCsv(params = {}) {
  const response = await authenticatedApi.get('/rutas/reporte.csv', {
    params,
    responseType: 'blob',
  });
  return response.data;
}

export async function fetchRouteReport(params = {}) {
  const response = await authenticatedApi.get('/rutas/reporte', { params });
  return response.data.reporte || { rows: [], total: 0 };
}

export async function downloadRouteReport(format, params = {}) {
  const response = await authenticatedApi.get(`/rutas/reporte.${format}`, {
    params,
    responseType: 'blob',
  });
  return response.data;
}

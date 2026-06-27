# Reporte CDANV2-04 - Roles y reportes

Fecha: 2026-06-27.

Resultado: cerrado por evidencia previa.

## Evidencia

- `backend/src/app.js` expone `/api/nomina/:id/rol-pdf` y `/api/nomina/:anio/:mes/roles-pdf-transpuesto`.
- `backend/src/services/payrollRolePdfService.js` genera rol individual y PDF general consolidado.
- `frontend-web/src/pages/Nomina/RolesPagos.jsx` muestra el comando comercial como `PDF general`, manteniendo el endpoint existente para no romper contratos.
- La generacion bancaria se mantiene separada en `/dashboard/nomina/pagos-bancarios` y exige banco pagador.

## Pruebas

- `nominaController.test.js` valida descarga de rol individual y PDF general del periodo.


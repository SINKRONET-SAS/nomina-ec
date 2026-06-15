# REPORTE CBN26-01 - PDF UploadFile y auth real

Estado: completed_local
Fecha: 2026-06-14

## Resultado

El diagnostico mencionaba `generarRolPagos.js`, `UploadFile`, `Blob` crudo y `base44.auth.getToken?.()`. En el stack real de Nomina-Ec no existen esos contratos ni dependencia Base44 en runtime; el flujo vigente usa `RolesPagos.jsx`, `authenticatedApi` y `GET /api/nomina/:id/rol-pdf`.

Se reforzo el contrato backend del PDF:

- `backend/src/controllers/nominaController.js` ahora devuelve `url`, `fileName`, `contentType`, `storageContract`, `encoding` y `correlationId`.
- El error de PDF no generado ahora usa codigo `NOMINA_PDF_NO_ENCONTRADO` y mensaje visible.
- `frontend-web/src/pages/Nomina/RolesPagos.jsx` mantiene auth real via `authenticatedApi` y muestra estados de exito/error sin fallo silencioso.

## Validacion

- `rg` no encontro `base44`, `UploadFile` ni `getToken?.(` en runtime.
- `node --check backend/src/controllers/nominaController.js` paso.
- Frontend build paso.

## Rollback

Revertir cambios en `nominaController.js` y `RolesPagos.jsx`; el endpoint volveria a entregar solo URL.

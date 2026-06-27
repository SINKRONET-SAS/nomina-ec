# Reporte CDANV2-02 - Auth JWT

Fecha: 2026-06-27.

Resultado: completado.

## Cambios

- `backend/src/middleware/auth.js` ahora arma `req.usuario`, `req.tenantId` y `req.usuarioId` desde claims firmados cuando el token incluye `userId`, `tenantId`, `email` y `rol`.
- Se conserva fallback contra BD para tokens legados sin claims completos.
- Se agrego `requireFreshUser` para rutas u operaciones que necesiten revalidar usuario activo contra BD.
- `backend/src/app.js` aplica `requireFreshUser` en operaciones criticas: superadmin mutativo, pagos sensibles, parametros legales, anonimizado y cierre/calculo/reapertura de nomina.
- `generateToken()` incluye `emailVerificadoEn` para evitar lecturas innecesarias.

## Pruebas

- `npm.cmd test -- auth.test.js communicationAuditService.test.js nominaController.test.js --runInBand`: PASS.
- `node --check src/middleware/auth.js`: PASS.

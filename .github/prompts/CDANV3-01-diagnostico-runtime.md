# CDANV3-01 - Diagnostico runtime

Objetivo: contrastar la auditoria V3 con el repo actual antes de implementar.

Verificar:
- `render.yaml`, `backend/package.json` y `backend/scripts/seed-superadmin-owner.js`.
- Payphone en `paymentController`, `app.js` y variables de entorno esperadas.
- `jwt.js`, `auth.js` y emision de tokens.
- `nominaController.descargarRolPDF`, `reporteController` y `payrollReportService`.
- App movil: dependencias, tabs, pantallas y ausencia/presencia de SQLite.
- PWA: rutas de reportes, roles, pagos y futuras aprobaciones.

No modificar runtime salvo reportes diagnosticos.

Cierre:
- Reporte `REPORTE_CDANV3_01_DIAGNOSTICO_RUNTIME.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-01 task: diagnostico-runtime`.

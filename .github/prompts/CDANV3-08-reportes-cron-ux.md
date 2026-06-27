# CDANV3-08 - Reportes, cron, periodo y UX

Objetivo: cerrar brechas P1 sin introducir cambios de alcance.

Implementar/verificar:
- `nominaController.descargarRolPDF` usa servicio real sin 500.
- `calcularNominaTodosTenants` existe o se define con logs estructurados.
- `RolesPagos.jsx` inicia periodo en `America/Guayaquil`.
- `reporteController` usa helper `requirePeriod`.
- Textos comerciales y tildes UTF-8 donde el archivo lo soporte.

Validar:
- Tests focales backend.
- Build web.
- Check mobile si se tocaron pantallas mobile.

Cierre:
- Reporte `REPORTE_CDANV3_08_REPORTES_CRON_UX.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-08 task: reportes-cron-ux`.

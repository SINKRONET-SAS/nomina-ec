# Reporte CDANV2-01 - Diagnostico runtime

Fecha: 2026-06-27.

Resultado: completado.

## Hallazgos reconciliados

- `SEC-V2-01`: falso positivo controlado. No se cambia SBU 2026 a USD 470; el plan conserva USD 482 hasta fuente oficial versionada y revision legal.
- `SEC-V2-04`: cerrado previamente. Superadmin tiene rutas `/api/superadmin/*`, servicio y pantalla `PlanesGestion.jsx`.
- `SEC-V2-05`: cerrado previamente. Rol individual y PDF general consumen `payrollRolePdfService`.
- `SEED-V2-01`: cerrado previamente. Existe `backend/scripts/seed-superadmin-owner.js` y script `seed:admins`.
- `MON-V2-01`: cerrado previamente por bloqueo visible de Stripe incompleto y PayPhone preservado.
- `ELIM-V2-01`: falso positivo. `docs2` es gobierno activo del plan.

## Brechas runtime ejecutadas

- `SEC-V2-02`: auth por claims JWT con fallback para tokens legados y `requireFreshUser`.
- `BUG-V2-03`: cierre mensual con cliente transaccional y bloqueo `FOR UPDATE`.
- `LEG-V2-05`: purga operativa de eventos de comunicacion vencidos.
- `UX-V2-02`: montos moviles formateados como USD Ecuador.


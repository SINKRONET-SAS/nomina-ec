# CDANV3-02 - Render seed admins

Objetivo: cerrar el despliegue nuevo sin superadmin.

Implementar:
- `render.yaml` debe ejecutar `npm run seed:admins` de forma idempotente.
- Declarar `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAMES`, `SUPERADMIN_LAST_NAMES` sin secretos.
- Readiness o logs claros si faltan variables.

Validar:
- `node --check backend/scripts/seed-superadmin-owner.js`
- Script de seed idempotente en entorno local/staging si hay variables demo seguras.
- No imprimir secretos.

Cierre:
- Reporte `REPORTE_CDANV3_02_RENDER_SEED_ADMINS.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-02 task: render-seed-admins`.

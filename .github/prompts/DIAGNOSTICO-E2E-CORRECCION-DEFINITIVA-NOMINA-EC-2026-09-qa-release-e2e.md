# E2E26-09 - QA y release gate E2E

Actua bajo `RULES.md`.

Objetivo: cerrar E2E26 con evidencia de flujo completo, scripts de diagnostico y release gate.

Tareas:

- Validar AuditLock E2E26-08.
- Adaptar scripts de diagnostico E2E, expiracion de invitaciones, pre-cierre y auditoria de reapertura si no quedaron antes.
- Ejecutar flujo smoke: registro tenant, verificacion/bloqueo, onboarding, empleado, invitacion, app, marcacion, novedad, calculo, cierre, rol y reapertura controlada.
- Ejecutar Prisma, tests backend, build/smoke PWA, Expo doctor y UTF-8.
- Actualizar plan, matriz, runbook, reporte final y AuditLock.
- Commit y push.

Cierre:

- E2E26 queda cerrado con evidencia reproducible.
- No quedan promesas falsas en README, landing, PWA o app.
- AuditLock firmado para E2E26-09.
- Commit esperado: `phase: E2E26-09 task: qa release e2e`.

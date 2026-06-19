# EAA26-08 - QA, rollback y release gate

Objetivo: cerrar el flujo con evidencia tecnica y operativa.

Gates minimos:

- Prisma validate/migrate/generate si hubo esquema.
- Tests backend focalizados.
- Build frontend si hubo UI web.
- Smoke Expo Go en telefono con backend LAN.
- Prueba de empleado invitado, activado y marcando asistencia.
- Prueba de bloqueo por falta de zona/jornada.
- AuditLock firmado.

Evidencia:

- Reporte `REPORTE_EAA26_08_QA_RELEASE.md`.
- Runbook Expo Go y backend LAN.
- Rollback de migracion o estrategia de desactivacion.

Commit esperado: `phase: EAA26-08 task: qa release app asistencia`.


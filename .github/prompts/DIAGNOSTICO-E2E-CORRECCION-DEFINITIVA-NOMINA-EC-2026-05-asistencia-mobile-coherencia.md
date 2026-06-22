# E2E26-05 - Asistencia movil y coherencia funcional

Actua bajo `RULES.md`.

Objetivo: alinear README, backend y app movil sobre marcacion, GPS, foto y almuerzo.

Tareas:

- Validar AuditLock E2E26-04.
- Revisar README, app Expo, endpoints mobile, `AttendanceMark`, zonas y jornadas.
- Confirmar si foto es alcance activo; si si, implementar con LOPDP/minimizacion; si no, retirar promesa visible.
- Exponer inicio/fin almuerzo si el negocio lo requiere o documentar que queda fuera de alcance activo.
- Mantener fail-closed si falta unidad, zona, jornada o periodo.
- Ejecutar `npx.cmd expo-doctor` y smoke manual Expo Go/desarrollo.

Cierre:

- No hay promesa falsa de foto/almuerzo.
- La app permite marcar solo cuando esta lista.
- AuditLock firmado para E2E26-05.
- Commit esperado: `phase: E2E26-05 task: asistencia mobile coherente`.

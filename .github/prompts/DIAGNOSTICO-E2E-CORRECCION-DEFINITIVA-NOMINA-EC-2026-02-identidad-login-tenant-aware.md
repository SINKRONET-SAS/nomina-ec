# E2E26-02 - Identidad y login tenant-aware

Actua bajo `RULES.md`.

Objetivo: eliminar ambiguedad de login cuando un email exista en mas de un tenant.

Tareas:

- Validar AuditLock E2E26-01.
- Revisar `authController`, modelo usuarios, registro owner y activacion empleado.
- Definir compatibilidad: login tenant-aware o bloqueo de duplicidad por rol operativo.
- Mantener anti-enumeracion y mensajes seguros.
- Ajustar PWA/app si se requiere seleccionar empresa.
- Probar login owner, RRHH, supervisor, empleado y superadmin.

Cierre:

- El login no selecciona usuario silenciosamente por `ORDER BY created_at DESC`.
- Los flujos existentes siguen compatibles.
- AuditLock firmado para E2E26-02.
- Commit esperado: `phase: E2E26-02 task: login tenant aware`.

# PNE26-04 - Autenticacion, RBAC y tenant activo

Ejecutar solo con aprobacion explicita.

Objetivo: asegurar que cada usuario opere solo dentro de su empresa, rol y capacidad comercial.

Tareas:
- Auditar auth actual, JWT, refresh tokens, recuperacion y registro.
- Formalizar roles: SUPERADMIN, OWNER, ADMIN_RRHH, SUPERVISOR y EMPLEADO, mapeados a roles existentes si aplica.
- Agregar tenant activo y validacion de permisos en backend.
- Cubrir rutas frontend/mobile segun rol.
- Registrar auditoria en cambios de permisos.

Validaciones:
- Tests auth/RBAC.
- `node --check` en backend modificado.
- Build frontend/mobile si aplica.
- Reporte `docs/REPORTE_PNE26_04_AUTH_RBAC.md`.
- AuditLock firmado.

No hacer:
- No confiar la seguridad solo a ocultar botones en UI.

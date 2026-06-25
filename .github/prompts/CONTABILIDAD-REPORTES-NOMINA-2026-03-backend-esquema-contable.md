# CRN26-03 - Backend esquema contable

Actua bajo `RULES.md`.

Objetivo: exponer servicios y API para administrar esquema contable por tenant sin cuentas hardcodeadas.

Tareas:

- Implementar servicio de conceptos y mapeos contables.
- Cargar defaults auditables sin asumir que son plan de cuentas real.
- Validar vigencia, duplicidad, estados y bloqueo de mappings historicos.
- Registrar auditoria con correlationId.
- Exponer endpoints protegidos para owner/admin_rrhh.

Cierre:

- Tests unitarios de mapping y validaciones.
- Errores con `code`, `statusCode`, `correlationId`, `userId`.
- Reporte `REPORTE_CRN26_03_BACKEND_ESQUEMA_CONTABLE.md`.
- AuditLock firmado.
- Commit esperado: `phase: CRN26-03 task: backend esquema contable`.

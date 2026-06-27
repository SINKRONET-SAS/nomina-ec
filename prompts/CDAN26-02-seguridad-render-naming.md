# CDAN26-02 - Seguridad Render y naming

Corregir exposicion de `plan_haiky` / `haiky_migration` en infraestructura o runtime expuesto.

Requisitos:
- Plan de migracion y rollback.
- Sin secretos en repo.
- Verificacion estatica con `rg`.
- UI o runbook de bloqueo si depende de accion externa en Render.
- AuditLock firmado.


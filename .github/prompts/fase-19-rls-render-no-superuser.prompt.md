# Fase 19 - RLS Render con usuario no superusuario

Actua bajo `RULES.md`.

Objetivo: probar RLS en Render usando credenciales no superusuario.

Tareas:

- Validar AuditLock de fase 18.
- Confirmar usuario de aplicacion no superusuario en PostgreSQL Render.
- Ejecutar prueba repetible con dos tenants de staging.
- Verificar lectura, escritura y aislamiento cruzado por tenant.
- Registrar evidencia sin secretos ni datos personales reales.
- Documentar rollback operativo.

Cierre:

- Runbook RLS Render actualizado.
- Evidencia de aislamiento tenant adjunta en docs2.
- AuditLock firmado para fase 19.


# DCEN26-02 - Tenant demo y usuarios

Actua bajo `RULES.md`.

Objetivo: crear tenant/empresa demo y 4 usuarios con roles comerciales.

Tareas:

- Validar AuditLock DCEN26-01.
- Implementar seed idempotente para empresa demo marcada como demo.
- Crear usuarios demo para OWNER, RRHH, supervisor/empleado y observacion comercial.
- Evitar secretos en repo; usar contrasenas temporales rotables o variables de entorno.
- Exponer evidencia en PWA o reporte operativo.

Cierre:

- Seed re-ejecutable sin duplicados.
- Reset seguro documentado.
- AuditLock firmado para DCEN26-02.
- Commit esperado: `phase: DCEN26-02 task: tenant usuarios demo`.

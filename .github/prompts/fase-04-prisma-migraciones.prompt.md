# Fase 4 - Prisma y migraciones

Actua bajo `RULES.md` y confirma que Fase 3 esta firmada.

Objetivo: decidir e implementar estrategia de migracion.

Decision requerida:

- Prisma como fuente de migraciones.
- Migrador SQL propio con `pg`.

Si se aprueba Prisma:

- Instalar `prisma` y `@prisma/client`.
- Crear `backend/prisma/schema.prisma`.
- Crear migracion inicial.
- Generar cliente.
- Documentar convivencia con `pg`.

Si se aprueba SQL:

- Crear `schema.sql`.
- Crear `migrate.js`.
- Registrar tabla de migraciones.

Cierre:

- Una sola estrategia activa.
- Rollback documentado.
- `AuditLock.json` actualizado.

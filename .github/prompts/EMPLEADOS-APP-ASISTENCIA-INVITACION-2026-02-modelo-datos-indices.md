# EAA26-02 - Modelo de datos e indices

Objetivo: disenar y aplicar, con aprobacion, el esquema de invitaciones y vinculo app-empleado.

Requisitos:

- Invitacion con `tenant_id`, `employee_id`, `invite_code_hash`, estado, expiracion, emisor, aceptacion, revocacion y reenvios.
- Vinculo unico activo entre usuario movil, empleado y tenant.
- Indices por tenant, empleado, estado, expiracion y hash.
- Migracion PostgreSQL/Prisma con rollback documentado.
- Ningun codigo en claro persistido.

Gates:

- `npx prisma validate`.
- Migracion local.
- Tests de constraints o servicio si existe capa disponible.

Commit esperado: `phase: EAA26-02 task: modelo invitacion empleado`.


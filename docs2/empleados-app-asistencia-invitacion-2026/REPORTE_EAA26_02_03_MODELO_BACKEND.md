# Reporte EAA26-02/03 - Modelo de datos y backend

## Entregado

- `employee_app_invites`: invitaciones con tenant, empleado, email, hash de codigo, expiracion, estado, origen y auditoria.
- `employee_app_links`: vinculo activo entre usuario movil, empleado y tenant.
- Indices parciales para codigo activo, invitacion pendiente por empleado, vinculo activo por empleado y vinculo activo por usuario.
- Extensiones de `marcaciones`: periodo, fecha operacional Ecuador, zona, unidad, jornada, precision GPS, origen y correlacion de auditoria.

## Backend

- `GET /api/empleados/app-invitaciones`
- `POST /api/empleados/:id/app-invitacion`
- `POST /api/empleados/app-invitaciones/:id/reenviar`
- `POST /api/empleados/app-invitaciones/:id/revocar`
- `POST /api/mobile/empleado/activar`

## Seguridad

- El codigo solo se persiste como hash SHA-256.
- Los mensajes publicos evitan revelar si el empleado, email o codigo existen.
- La aceptacion valida email, codigo, clave, privacidad, consentimiento LOPDP y geolocalizacion.
- Las consultas operativas filtran por tenant y empleado.

## Migracion

Migracion aplicada localmente:

`backend/prisma/migrations/20260618223000_eaa26_employee_app_invites/migration.sql`

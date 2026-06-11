# RBAC SUPERADMIN y OWNERS

Fecha: 2026-06-11

## Roles

- `superadmin`: administracion global y soporte tecnico. No pertenece a un tenant.
- `owner`: propietario de tenant. Administra usuarios y configuracion de su tenant.
- `admin_rrhh`: opera empleados, asistencia, nomina y documentos.
- `supervisor`: consulta y aprueba novedades segun alcance.
- `empleado`: marcaciones y consulta propia.

## Cambios aplicados

- `POST /api/auth/login` y `POST /api/auth/refresh` permanecen publicos.
- `POST /api/auth/register` ahora requiere token y rol `superadmin` u `owner`.
- Las rutas `/api/*` de negocio requieren autenticacion JWT.
- El resolver de tenant registra errores en lugar de fallar silenciosamente.
- Se agrego `backend/scripts/seed-superadmin-owner.js` para crear SUPERADMIN y OWNER desde variables de entorno.

## Variables para seed

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`
- `OWNER_TENANT_RUC`
- `OWNER_TENANT_RAZON_SOCIAL`
- `OWNER_EMAIL`
- `OWNER_PASSWORD`

## Riesgos abiertos

- Falta aplicar `requireRole` granular por modulo.
- Falta auditoria persistente de acciones privilegiadas.
- Falta flujo de impersonacion auditada para soporte.

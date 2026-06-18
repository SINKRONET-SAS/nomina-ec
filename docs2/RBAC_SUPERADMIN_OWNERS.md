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
- Se agrego `backend/scripts/seed-superadmin-owner.js` para crear el SUPERADMIN tecnico desde variables de entorno.
- El OWNER y la empresa cliente deben crearse desde el flujo de registro de la aplicacion. El seed solo crea OWNER si se configuran variables demo opcionales.

## Variables para seed local

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`

## Variables demo opcionales

Estas variables no son necesarias para operar el sistema real. Solo sirven para crear un tenant owner de prueba despues de resetear la base local.

- `OWNER_TENANT_RUC`
- `OWNER_TENANT_RAZON_SOCIAL`
- `OWNER_TENANT_NOMBRE_COMERCIAL`
- `OWNER_EMAIL`
- `OWNER_PASSWORD`

## Riesgos abiertos

- Falta aplicar `requireRole` granular por modulo.
- Falta auditoria persistente de acciones privilegiadas.
- Falta flujo de impersonacion auditada para soporte.

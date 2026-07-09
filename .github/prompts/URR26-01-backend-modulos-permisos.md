# URR26 01 - Backend: modulos y permisos

Usar `.github/CODEX_CONTEXT.md` y `RULES.md`.

Objetivo: implementar el sistema de permisos por modulo en backend.

Tareas:

1. Crear `backend/src/config/modules.js`:
   - Exportar `ALL_MODULES`: array de objetos `{ code, label, description }` para los 9 modulos.
   - Exportar `DEFAULT_MODULE_PERMISSIONS`: mapa `{ [rol]: { [moduleCode]: boolean } }` con defaults por rol.
   - Exportar `MODULE_ROUTE_PREFIX`: mapa `{ [routePrefix]: moduleCode }` para resolver modulo desde ruta API.

2. Agregar columna `module_permissions JSONB DEFAULT NULL` a la tabla `usuarios`:
   - Crear migracion SQL en `backend/prisma/migrations/`.
   - `NULL` = usar defaults del rol; objeto = override explicito.

3. Crear middleware `requireModule(moduleCode)` en `backend/src/middleware/moduleAuth.js`:
   - Cargar `module_permissions` del usuario desde DB (cachear en `req.usuario`).
   - Resolver permisos efectivos: defaults del rol + overrides.
   - `superadmin` y `owner` siempre tienen acceso total.
   - Retornar 403 `MODULO_NO_AUTORIZADO` si denegado.

4. Aplicar `requireModule()` en `backend/src/app.js` a los grupos de rutas:
   - `/api/empleados/*` -> `requireModule('empleados')`
   - `/api/marcaciones/*`, `/api/novedades/*` -> `requireModule('asistencia')`
   - `/api/movilizacion/*`, `/api/mobile/permisos` -> `requireModule('operacion')`
   - `/api/nomina/*`, `/api/beneficios/*` -> `requireModule('nomina')`
   - `/api/documentos/*` -> `requireModule('documentos')`
   - `/api/reportes/*` -> `requireModule('reportes')`
   - `/api/configuracion/*` -> `requireModule('parametrizacion')`
   - `/api/comunicaciones/*` -> `requireModule('comunicaciones')`
   - `/api/auditoria` -> `requireModule('auditoria')`

5. Crear endpoints de gestion de permisos por modulo:
   - `GET /api/usuarios/:id/permisos-modulo` - devuelve permisos efectivos y overrides.
   - `PUT /api/usuarios/:id/permisos-modulo` - actualiza overrides. Solo `owner`/`superadmin`.
   - Incluir en `session-context` los `modulePermissions` efectivos del usuario autenticado.

6. Registrar auditoria en cada cambio de permisos.

Gate: tests backend verdes, middleware aplicado, endpoints funcionales.

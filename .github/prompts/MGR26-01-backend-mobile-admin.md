# MGR26-01 - Backend movil administrativo

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: exponer API movil administrativa para zonas de marcacion, sitios de ruta y asignacion diaria, sin duplicar modelos.

Tareas:

- Crear resumen `GET /api/mobile/admin/rutas/resumen` con zonas, sitios, rutas, empleados y `allowedActions`.
- Crear `POST /api/mobile/admin/zonas` usando `configurationService.createResource('workZones')`.
- Crear `POST /api/mobile/admin/rutas/sitios` usando `routeVisitService.createRouteSite`.
- Crear `POST /api/mobile/admin/rutas/dias` usando `routeVisitService.createRouteDay` con `source = mobile`.
- Proteger endpoints con `requireMobileAppPlan` y `requireFieldRoutesPlan`.
- Mantener `owner/admin_rrhh` para crear zonas/sitios y `owner/admin_rrhh/supervisor` para resumen/asignacion.

Cierre:

- Errores visibles con `correlationId`.
- Pruebas de controlador y rutas actualizadas.
- Sin respuesta publica existente modificada de forma incompatible.

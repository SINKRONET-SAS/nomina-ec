# Reporte DCF26-09 - SUPERADMIN sin duplicidad

## Resultado

DCF26-09 queda cerrada como fase runtime. La operacion SUPERADMIN ya no depende de un catalogo generico: la pantalla real de Gestion de planes ahora concentra planes comerciales, owners/contratos e incidencias usando tablas operativas.

## Cambios funcionales

- Se agrego `support_incidents` para incidencias de plataforma.
- Se agrego `superadminService` con:
  - overview de planes comerciales reales.
  - owners desde `tenants`.
  - contratos desde `suscripciones` y `planes_comerciales`.
  - conteos reales de empleados y usuarios activos.
  - incidencias desde `support_incidents`.
- Se agregaron endpoints protegidos por rol `superadmin`:
  - `GET /api/superadmin/overview`
  - `POST /api/superadmin/incidencias`
  - `PUT /api/superadmin/incidencias/:id`
- Se actualizo `PlanesGestion`:
  - conserva gestion de planes comerciales.
  - agrega panel "Owners, contratos e incidencias".
  - lista owners/contratos reales.
  - permite registrar incidencias por owner o generales.
  - permite cerrar incidencias.
- Se actualizo `OperacionIntegral`: el modulo SUPERADMIN ya no aparece bloqueado cuando el usuario tiene rol `superadmin`.

## Validaciones ejecutadas

- `npx.cmd prisma validate` en `backend`: PASS.
- `node --check src/services/superadminService.js`: PASS.
- `node --check src/controllers/superadminController.js`: PASS.
- `node --check src/app.js`: PASS.
- `npm.cmd test -- superadminService.test.js --runInBand`: PASS, 1 suite, 3 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `git diff --check`: PASS, solo avisos CRLF esperados en Windows.

## Riesgos residuales

- Las incidencias no abren sesiones de soporte dentro del tenant; eso evita romper aislamiento, pero limita soporte remoto avanzado.
- Addons aun dependen del modelo de planes/capacidades existente; una tabla especifica de addons queda para una fase posterior.
- La consola lista hasta 50 owners e incidencias; paginacion y filtros avanzados quedan como mejora de escala.

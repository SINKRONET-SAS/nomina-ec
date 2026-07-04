# REPORTE MRA26-00 A MRA26-03 - CIERRE RUNTIME

## Resumen

Se ejecuto el plan `HAIKY-MONETIZACION-RUTAS-APP-SKNOMINA-2026` para convertir Rutas de campo y App movil en canales comerciales gobernados desde Gestion de planes.

## Cambios ejecutados

- Prisma agrega `CommercialPlan.appMovil` y `CommercialPlan.rutasCampo`, mapeados a `planes_comerciales.app_movil` y `planes_comerciales.rutas_campo`.
- Migracion `20260703090000_mra26_plan_routes_mobile_channels` agrega columnas, actualiza planes base y marca metadata MRA26.
- `planCapabilityService` expone `mobileApp` y `fieldRoutes`.
- Nuevo middleware `requirePlanCapability` centraliza la validacion por plan.
- `/api/rutas/*` exige `fieldRoutes`.
- `/api/mobile/*` exige `mobileApp`; rutas dentro de mobile exigen tambien `fieldRoutes`.
- `/api/movilizacion/*` exige `mobileApp`.
- Gestion de planes permite activar `App movil empleados` y `Rutas de campo`.
- Catalogo publico muestra highlights de app movil y rutas segun el plan.
- PWA de Rutas de campo valida el plan y muestra bloqueo comercial antes de cargar datos.
- App movil muestra bloqueo de plan sin convertirlo en acceso administrativo.
- `scripts/verify-system-contracts.mjs` protege el contrato MRA26.

## Validacion ejecutada

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- planCapabilityService.test.js app.routes.test.js paymentController.test.js --runInBand`: PASS, 3 suites y 13 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS funcional; Vite genero artefactos y reporto `built in 10.22s`, luego el proceso no libero prompt y se cerro por PID.
- `npm.cmd run check:mobile`: PASS.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.
- UTF-8 sin BOM: PASS, 28 archivos modificados o nuevos verificados.

## Riesgos residuales

- La aplicacion de la migracion en ambiente productivo requiere ejecutar `prisma migrate deploy`.
- Los planes editados con suscripciones activas siguen versionandose para no mutar contratos comerciales previos.

# Plan Haiky MGR26 - Mobile gestion de rutas y zonas 2026

Codigo: `MGR26`

Plan: `HAIKY-MOBILE-GESTION-RUTAS-ZONAS-2026`

Fecha base: 2026-07-04

Repositorio: `nuevo_nomina`

Solicitud:

La app movil debe permitir crear zonas de marcacion, sitios/rutas de campo y asignar rutas a usuarios de la app con perfil apropiado. Las acciones que el perfil no pueda ejecutar no deben quedar visibles en la app.

Alcance operativo:

- Reutilizar `work_zones` por `configurationService`; no crear modelo paralelo.
- Reutilizar `route_sites`, `route_days` y `route_stops` por `routeVisitService`.
- Exponer endpoints moviles administrativos bajo `/api/mobile/admin/...` con gates `mobileApp` y `fieldRoutes`.
- Permitir gestion movil por perfil:
  - `owner` y `admin_rrhh`: crear zonas de marcacion, crear sitios de ruta y asignar rutas.
  - `supervisor`: consultar operacion y asignar rutas; no ve creacion de zonas ni sitios.
  - `superadmin`: no opera tenant desde app movil; queda guiado a PWA.
- Mantener PWA existente como centro completo de parametrizacion.

Fuera de alcance:

- No cambiar modelo legal/laboral de marcacion.
- No eliminar pantallas PWA existentes.
- No crear migraciones si las tablas actuales cubren el caso.
- No mostrar controles deshabilitados para perfiles sin permiso; deben ocultarse.

Fases:

## MGR26-00 - Baseline y gobierno

Objetivo: registrar plan, contexto y prompts.

Entregables:

- Plan en `docs2/PLAN_HAIKY_MOBILE_GESTION_RUTAS_ZONAS_2026.md`.
- Prompts `MGR26-00` a `MGR26-03`.
- Contexto en `.github/CODEX_CONTEXT.md`.
- Reporte de ejecucion en `docs2/mobile-gestion-rutas-zonas-2026/`.

Criterios de cierre:

- Artefactos en `docs2`, no en `docs`.
- `AuditLock.json` actualizado al cierre.

## MGR26-01 - Backend movil administrativo

Objetivo: habilitar API movil administrativa sin duplicar servicios.

Entregables:

- Resumen administrativo movil de rutas, zonas, sitios y empleados activos.
- Creacion movil de zona de marcacion con `configurationService.createResource('workZones')`.
- Creacion movil de sitio de ruta con `routeVisitService.createRouteSite`.
- Asignacion movil de ruta diaria con `routeVisitService.createRouteDay` y `source = mobile`.
- RBAC y gates por plan en `backend/src/app.js`.

Criterios de cierre:

- `owner/admin_rrhh/supervisor` pueden consultar y asignar rutas.
- Solo `owner/admin_rrhh` pueden crear zonas y sitios.
- Errores con mensaje visible, `correlationId` y log estructurado.

## MGR26-02 - App movil por perfil

Objetivo: exponer la funcionalidad en Expo sin mostrar acciones no autorizadas.

Entregables:

- `OperacionMovilScreen` para consola de campo.
- API movil cliente para endpoints `/mobile/admin/...`.
- `App.js` enruta `owner/admin_rrhh/supervisor` a operacion movil.
- `superadmin` queda con aviso y no entra a operacion tenant.

Criterios de cierre:

- Si el perfil no crea zonas, no ve la seccion de zonas.
- Si el perfil no crea sitios, no ve la seccion de sitios.
- Si el perfil no asigna rutas, no ve la seccion de asignacion.

## MGR26-03 - QA, contratos y cierre

Objetivo: cerrar sin regresiones.

Gates:

- `node --check backend/src/controllers/mobileController.js`
- `node --check backend/src/services/routeVisitService.js`
- `npm.cmd --workspace=backend test -- --runTestsByPath src/controllers/mobileController.test.js src/app.routes.test.js --runInBand`
- `npm.cmd run contracts`
- `npm.cmd run check:mobile`
- `git diff --check`
- Validacion UTF-8 sin BOM de archivos modificados `.js`, `.mjs`, `.json` y `.md`.

Commit esperado:

`phase: MGR26-03 task: mobile gestion rutas zonas`

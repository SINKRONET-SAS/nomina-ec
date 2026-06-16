# DCF26-09 - SUPERADMIN sin duplicidad

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P1

## Objetivo

Unificar SUPERADMIN en fuentes de verdad reales: planes, addons, owners, contratos e incidencias sin catalogos paralelos.

## Alcance

- Reusar `paymentController` y tablas de planes para planes/addons.
- Owners y contratos con endpoints dedicados o vista clara de solo lectura si aun no existen.
- Incidencias con estado, responsable, SLA y auditoria.
- `OperacionIntegral` debe linkear al modulo real o mostrar bloqueo.

## Reglas

- No duplicar plan/addon en `configuration_catalogs`.
- No permitir superadmin editar datos tenant operativos sin auditoria.
- No romper aislamiento tenant.

## Entregables

- UI SUPERADMIN coherente.
- Servicios/queries reales.
- Tests de permisos.
- Reporte `REPORTE_DCF26_09_SUPERADMIN_SIN_DUPLICIDAD.md`.

## Gates

- Backend tests.
- Frontend build.
- Smoke con rol superadmin.

# Reporte CRN26-03 - Backend esquema contable

## Estado

Completado localmente.

## Entregables

- `backend/src/services/payrollAccountingService.js` con catalogo canonico CRN26 y defaults auditables.
- `configurationService` expone `payrollAccountingMappings` como recurso tenant-aware.
- Validacion de concepto, categoria, tipo de asiento, vigencia, estado y cuentas debe/haber.
- Semilla automatica solo si el tenant no tiene ningun mapping contable.
- Endpoints dedicados:
  - `GET /api/nomina/contabilidad/conceptos`
  - `GET /api/nomina/contabilidad/mapeos`
  - `POST /api/nomina/contabilidad/mapeos`
  - `PUT /api/nomina/contabilidad/mapeos/:id`

## Auditoria

El CRUD dedicado reutiliza `configurationService`, por lo que conserva `recordAudit` para creacion y actualizacion.

## Gate

- `node --check backend/src/controllers/payrollAccountingController.js`: PASS.
- `node --check backend/src/services/configurationService.js`: PASS.

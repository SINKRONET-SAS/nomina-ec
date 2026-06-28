# REPORTE MSF26-03 - Carga de saldos runtime

Fecha: 2026-06-28  
Estado: completed_local

## Backend

- Servicio: `backend/src/services/initialBalanceService.js`.
- Controlador: `backend/src/controllers/initialBalanceController.js`.
- Rutas:
  - `GET /api/onboarding/saldos-iniciales/plantilla.csv`
  - `GET /api/onboarding/saldos-iniciales/plantilla.xlsx`
  - `GET /api/onboarding/saldos-iniciales/lotes`
  - `POST /api/onboarding/saldos-iniciales/dry-run`
  - `GET /api/onboarding/saldos-iniciales/lotes/:batchId`
  - `POST /api/onboarding/saldos-iniciales/lotes/:batchId/commit`
  - `POST /api/onboarding/saldos-iniciales/lotes/:batchId/revertir`

## Cierre funcional

- Dry-run valida empleado activo, cedula, tipo de saldo, periodo y formato numerico.
- Periodos cerrados bloquean la fila antes de aplicar.
- Commit y reversa operan con transaccion, bloqueo del lote y auditoria.
- El motor de nomina lee saldos `committed` y los refleja en `detalle_calculo.saldosIniciales`.

## Pruebas

- `initialBalanceService.test.js`: normalizacion, plantilla, periodo cerrado y resumen para nomina.
- `calculoNominaService.batch.test.js`: lote de calculo sigue verde con consulta de saldos iniciales.

# Reporte ANV2-04 - Firmas legales

## Objetivo

Cerrar LEG-H01: roles, contratos y actas laborales generadas desde el sistema deben incluir evidencia de representante legal/delegado, trabajador, version de plantilla y estado de revision.

## Cambios runtime

- `backend/src/services/payrollRolePdfService.js`
  - Agrega bloque `Recepcion y conformidad`.
  - Firma por representante legal/delegado del empleador y trabajador.
  - Lee `tenant_configuracion` para nombre e identificacion del representante.
  - Declara version de plantilla `rol_pago_nomina_ec v2026.06`.
- `backend/src/services/templateGenerator.js`
  - Refuerza contratos con identificacion del representante legal en resumen y firma.
- `backend/src/services/equipmentDeliveryActService.js`
  - Refuerza actas de dotacion con representante legal, identificacion y firma de delegado/empleador.
  - Guarda representante e identificacion en metadata del documento.
- `scripts/verify-system-contracts.mjs`
  - Agrega verificaciones estaticas para que roles y actas no pierdan estos bloques.

## Resultado

LEG-H01 queda cerrado tecnicamente para documentos generados. La revision legal profesional sigue como gate de salida comercial, conforme al contrato ANV2.

## Pruebas

- `npm.cmd --workspace=backend test -- payrollRolePdfService.test.js templateGenerator.test.js equipmentDeliveryActService.test.js`: OK.
- `npm.cmd run contracts`: OK.

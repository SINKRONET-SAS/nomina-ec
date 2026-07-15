# NER26-05 - Rol con descuentos persistidos

## Objetivo

Verificar y corregir que el rol de pagos muestre todos los tipos de descuento calculados, incluyendo descuentos configurables persistidos en `payroll_calculation_lines`.

## Alcance

- El PDF de rol individual debe consultar `payroll_calculation_lines`.
- El PDF consolidado transpuesto debe consultar `payroll_calculation_lines`.
- Los descuentos dinamicos deben mostrarse aunque `detalle_calculo.novedadesCalculadas` este incompleto o no exista.
- No cambiar totales, contratos publicos ni flujo de calculo de nomina.

## Gates

- `node --check backend/src/services/payrollRolePdfService.js`
- `npm.cmd --workspace=backend test -- payrollRolePdfService.test.js --runInBand`
- `git diff --check` limitado a NER26-05.
- `python -m json.tool .vscode/AuditLock.json`

# NER26-04 - Rol de pago con novedades dinamicas

## Objetivo

Corregir el reporte/PDF de rol para que no dependa de una lista fija de conceptos de novedad y refleje tipos nuevos incorporados al calculo de nomina.

## Alcance

- Usar `payroll_calculation_lines` o `detalle_calculo.novedadesCalculadas` como fuente canonica de novedades del rol.
- Mostrar conceptos dinamicos en el rol individual.
- Mostrar conceptos dinamicos como filas del rol consolidado transpuesto.
- Mantener totales existentes y no modificar contratos publicos de API.

## Gates

- `node --check backend/src/services/payrollRolePdfService.js`
- `npm.cmd --workspace=backend test -- payrollRolePdfService.test.js --runInBand`
- `git diff --check` limitado a los archivos modificados de NER26-04.
- `python -m json.tool .vscode/AuditLock.json`

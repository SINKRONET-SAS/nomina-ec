# HRD26-01 Backend reportes

Base: `RULES.md` y fase HRD26-00 firmada.

Objetivo: implementar o verificar `PAYROLL_NOVELTY_MATRIX` en backend.

Requisitos:

- Una fila por empleado.
- Columnas dinamicas solo para novedades del rol.
- Totales de ingreso, deduccion y neto por novedad.
- Mantener reportes existentes sin romper API publica.
- Agregar prueba focalizada.

Validacion minima:

- `npm --workspace=backend test -- payrollReportService.test.js --runInBand`
- `node scripts/verify-system-contracts.mjs`

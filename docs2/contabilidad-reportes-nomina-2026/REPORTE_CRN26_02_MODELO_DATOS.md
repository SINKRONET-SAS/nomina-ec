# Reporte CRN26-02 - Modelo de datos

## Estado

Completado localmente.

## Entregables

- Modelo Prisma `PayrollAccountingMapping` mapeado a `payroll_accounting_mappings`.
- Modelo Prisma `PayrollCalculationLine` mapeado a `payroll_calculation_lines`.
- Migracion `backend/prisma/migrations/20260624210000_crn26_payroll_accounting_reports/migration.sql`.
- RLS con `app_current_tenant_id()` para ambas tablas.
- Indices por tenant, periodo, empleado, nomina y concepto.
- Rollback documentado al inicio de la migracion.

## Reglas preservadas

- Los defaults son semilla editable por tenant.
- Las lineas de calculo quedan separadas de `detalle_calculo`, que se conserva por compatibilidad.
- Las nominas cerradas no se recalculan por mappings nuevos.

## Gate

- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS.

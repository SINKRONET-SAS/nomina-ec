# ONI26-03 - Parametros a cuentas contables

## Resultado

Se creo un contrato de mapeo contable y un catalogo base versionado para preparar asientos contables por tenant sin imponer cuentas reales.

## Archivos

- `backend/src/config/accounting-mapping-defaults.json`
- `docs2/operacion-nomina-ec-integral-2026/CONTRATO_ONI26_03_MAPEO_CONTABLE.md`

## Riesgos residuales

- Falta migracion runtime para persistir overrides por tenant.
- Las cuentas reales deben ser configuradas por cada empresa.
- Integracion contable externa queda para fase de API o ERP.

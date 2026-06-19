# DVN26-06 - Bancos y reportes exportables

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P1.

## Objetivo

Resolver F-01, F-04, D-02 y D-03: archivos bancarios, reportes tabulares y exportacion CSV/Excel/PDF por persona o estructura organizativa.

## Reglas

- No generar archivo bancario con cuentas placeholder.
- Todo reporte debe filtrar por tenant, anio, mes y estructura.
- Datos bancarios descifrados solo en memoria.

## Entregables

- Perfiles Pichincha, Guayaquil, Produbanco y Bolivariano.
- Exportacion Excel/PDF/CSV de nomina, IESS y provisiones.
- UI de descargas por persona, area, departamento o centro de costo.
- Tests de totales y formatos.
- Reporte `REPORTE_DVN26_06_BANCOS_REPORTES.md`.

## Gate

Tests backend, build frontend y archivos de prueba con datos ficticios.

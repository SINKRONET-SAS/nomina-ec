# DVN26-03 - Liquidacion, acta de finiquito y contrato

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P0.

## Objetivo

Resolver E-05, E-06, F-02, F-03 y B-05: liquidacion correcta, acta de finiquito PDF, contrato PDF y registro DocumentoLegal.

## Reglas

- Adaptar scripts 08 y 09 al stack Express/pdfmake/doc service; prohibido usar Base44/Deno.
- Acta y contrato deben quedar descargables desde UI.
- No prometer formato oficial definitivo sin revision legal.

## Entregables

- Servicio PDF para acta de finiquito y contrato.
- Registro `DocumentoLegal` por documento generado.
- UI de documentos por empleado.
- Tests de periodos de decimo tercero y tope de indemnizacion.
- Reporte `REPORTE_DVN26_03_DOCUMENTOS_LEGALES.md`.

## Gate

Backend tests, frontend build y evidencia de PDF generado con datos ficticios.

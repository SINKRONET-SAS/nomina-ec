# MDS26-04 - Reportes

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: los reportes de nomina deben reflejar la modalidad de mensualizacion elegida.

Tareas:

- En `payrollAccountingService.js`: agregar conceptos contables para decimo tercero/cuarto mensualizado cuando la modalidad sea `mensual`.
- En `payrollReportService.js`: incluir columnas de modalidad en reportes de nomina mensual.
- En `payrollRolePdfService.js`: mostrar lineas de decimos mensualizados en el PDF del rol.
- Asegurar que la provision contable se ajuste: si se paga mensual, no se provisiona doblemente.

Cierre:

- Reportes muestran modalidad y montos.
- Contabilidad refleja correctamente el pago mensual vs provision.
- PDF del rol incluye lineas de decimos mensualizados.

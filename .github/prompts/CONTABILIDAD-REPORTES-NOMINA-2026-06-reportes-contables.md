# CRN26-06 - Reportes contables

Actua bajo `RULES.md`.

Objetivo: generar reportes contables de nomina basados en mapping vigente y asientos balanceados.

Tareas:

- Generar asientos de devengamiento, provisiones y pago.
- Consumir mapping por tenant y periodo.
- Bloquear reporte si falta mapping requerido.
- Validar debe/haber por asiento, centro de costo y periodo.
- Exportar XLSX/CSV y resumen PDF cuando aplique.

Cierre:

- Tests de balance contable, mapping faltante y agrupacion.
- Reporte `REPORTE_CRN26_06_REPORTES_CONTABLES.md`.
- AuditLock firmado.
- Commit esperado: `phase: CRN26-06 task: reportes contables nomina`.

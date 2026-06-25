# Reporte CRN26-00 - Baseline documental

## Alcance

Se desplego documentacion base para resolver definitivamente el requerimiento de esquema contable, reportes de calculo de nomina, matriz empleados x beneficios y reportes contables de nomina.

## Hallazgos iniciales

- Existe `accounting-mapping-defaults.json`, pero opera como defaults y no como esquema contable gobernado por tenant con vigencia.
- `detalle_calculo` contiene datos utiles, pero no hay lineas normalizadas por concepto para reporteria y contabilidad.
- `payrollReportService` ya genera detalle tabular y asientos iniciales, pero debe evolucionar a mapping configurable, matriz dinamica y balance estricto.
- La PWA expone exportacion de reportes internos, pero no administra esquema contable ni reportes contables con validacion operativa.

## Archivos desplegados

- `docs2/PLAN_HAIKY_CONTABILIDAD_REPORTES_NOMINA_2026.md`
- `docs2/contabilidad-reportes-nomina-2026/MATRIZ_CRN26_REQUERIMIENTOS.md`
- `docs2/contabilidad-reportes-nomina-2026/CONTRATO_CRN26_ESQUEMA_REPORTES_CONTABLES.md`
- `docs2/contabilidad-reportes-nomina-2026/RUNBOOK_CRN26_QA_RELEASE.md`
- `.github/prompts/CONTABILIDAD-REPORTES-NOMINA-2026-{00..08}-*.md`
- `CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

## Estado

CRN26-00 queda `completed_documental`. No se tocaron migraciones, backend runtime, frontend runtime ni app movil.

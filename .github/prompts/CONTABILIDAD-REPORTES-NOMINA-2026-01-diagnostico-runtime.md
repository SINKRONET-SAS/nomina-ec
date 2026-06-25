# CRN26-01 - Diagnostico runtime

Actua bajo `RULES.md`.

Objetivo: auditar el estado real de parametros, calculo de nomina, beneficios, reportes, contabilidad y PWA antes de disenar cambios.

Tareas:

- Revisar schema Prisma, `calculoNominaService`, `beneficioEmpleadoService`, `payrollReportService` y controladores de reportes.
- Revisar `accounting-mapping-defaults.json` y catalogos operativos relacionados.
- Revisar PWA de parametrizacion y reportes.
- Identificar contratos publicos que no deben romperse.
- Documentar brechas: mapping por tenant, lineas de calculo, matriz beneficios, asientos balanceados y UI.

Cierre:

- Crear `REPORTE_CRN26_01_DIAGNOSTICO_RUNTIME.md`.
- Sin runtime salvo correcciones menores aprobadas en la fase.
- AuditLock firmado.
- Commit esperado: `phase: CRN26-01 task: diagnostico contabilidad reportes`.

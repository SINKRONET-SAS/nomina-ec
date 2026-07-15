# HRD26-00 Baseline

Lee `RULES.md`, `.github/CODEX_CONTEXT.md`, `.vscode/AuditLock.json` y `docs2/PLAN_HAIKY_REPORTES_DISPONIBILIDAD_CLIENTES_2026.md`.

Objetivo: confirmar el estado actual de LANDING, PWA, BACKEND y MOBILE para reportes y disponibilidad de clientes.

Checks obligatorios:

- `git status --short`
- `rg -n "PAYROLL_|reportes|nomina|mobile/nomina|Batch IESS|TXT IESS" backend/src frontend-web/src app-movil/src`
- Verificar que no se proponga una regresion ni un despliegue basado en falsos positivos.

Salida esperada:

- Lista corta de hallazgos confirmados.
- Archivos que deben tocarse en fases posteriores.
- Sin cambios runtime salvo diagnostico.

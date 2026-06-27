# CDANV3-00 - Baseline documental

Objetivo: crear o actualizar solo artefactos de gobierno CDANV3: plan, matriz, contrato, runbook, prompts, `.github/CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.

Reglas:
- No tocar runtime backend, frontend-web ni app-movil.
- Aplicar `RULES.md`.
- No crear `CODEX_CONTEXT.md` en raiz.
- Cerrar con AuditLock firmado y commit `phase: CDANV3-00 task: baseline-documental`.

Entregables:
- `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026_V3.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/*`
- `.github/prompts/CDANV3-{00..10}-*.md`
- `.github/CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

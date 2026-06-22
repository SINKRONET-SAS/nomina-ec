# E2E26-00 - Baseline documental

Actua bajo `RULES.md`.

Objetivo: desplegar el plan documental E2E26 desde `Diagnostico_E2E.docx` sin tocar runtime.

Tareas:

- Leer `RULES.md`, `CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.
- Extraer hallazgos del diagnostico E2E recibido.
- Crear plan, matriz, runbook, reporte baseline y prompts E2E26.
- Registrar E2E26 en `CODEX_CONTEXT.md` y AuditLock.
- Validar UTF-8 sin BOM.

Cierre:

- E2E26-00 queda `completed_documental`.
- E2E26-01..09 quedan `pending_approval`.
- Commit esperado: `phase: E2E26-00 task: baseline diagnostico e2e`.

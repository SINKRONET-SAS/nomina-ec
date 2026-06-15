# CBN26-00 - Baseline documental

Actua bajo `RULES.md`.

Objetivo: desplegar el plan `HAIKY-CIERRE-BRECHAS-NOMINA-EC-DIAGNOSTICO-2026` sin tocar runtime.

Contexto obligatorio:
- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Leer `docs/PLAN_HAIKY_CIERRE_BRECHAS_NOMINA_EC_DIAGNOSTICO_2026.md`.

Tareas:
- Crear o validar el plan documental.
- Crear prompts CBN26-00..10 en `.github/prompts`.
- Actualizar `.vscode/AuditLock.json` como baseline desplegado.

Validaciones:
- JSON parse de `.vscode/AuditLock.json`.
- UTF-8 sin BOM en archivos modificados.
- `git diff --check`.

No hacer:
- No modificar backend, frontend, mobile, Prisma ni despliegue.

Commit esperado: `phase: CBN26-00 task: baseline documental`.

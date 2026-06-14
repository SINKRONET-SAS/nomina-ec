# PNE26-00 - Baseline documental

Objetivo: desplegar el plan `HAIKY-PRODUCTIZACION-NOMINA-EC-DOCUMENTO-NOMINA-2026` sin tocar runtime.

Contexto obligatorio:
- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Leer `docs/PLAN_HAIKY_PRODUCTIZACION_NOMINA_EC_DOCUMENTO_NOMINA.md`.
- Usar `C:\proyectos web\Docs\documento_nomina.md` solo como fuente de requerimiento, normalizando mojibake antes de citar o copiar.

Tareas:
- Crear o validar el plan documental.
- Crear prompts por fase en `.github/prompts`.
- Actualizar `AuditLock.json` como baseline desplegado.

Validaciones:
- JSON parse de `.vscode/AuditLock.json`.
- UTF-8 sin BOM en archivos modificados.
- `git diff --check`.

No hacer:
- No modificar backend, frontend, mobile, Prisma ni despliegue.

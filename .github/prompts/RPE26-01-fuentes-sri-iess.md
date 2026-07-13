# RPE26-01 - Fuentes SRI e IESS

Objetivo: separar fuentes oficiales validadas de preparaciones operativas pendientes.

Reglas:
- RDEP/Formulario 107 se mantienen como SRI si conservan manifest, XSD o referencia versionada.
- IESS queda como prevalidacion si no existe XML/XSD oficial versionado en el repo.
- No borrar evidencia historica; supersederla con contexto nuevo cuando corresponda.

Tareas:
- Actualizar manifest IESS con `pending_official_iess_format`.
- Actualizar `.github/CODEX_CONTEXT.md` con decision RPE26.
- Documentar que DPS26 queda supersedido solo en el alcance SAE/IESS como XML oficial.

Cierre:
- Contexto y manifest reflejan que IESS no es XML oficial productivo.


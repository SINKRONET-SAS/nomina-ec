# ANV1-02 Seguridad de repo y naming

Objetivo: cerrar exposicion de contexto y naming interno visible.

Instrucciones:
- Mover `CODEX_CONTEXT.md` desde raiz a `.github/CODEX_CONTEXT.md` y actualizar referencias vivas.
- Mantener `RULES.md` en raiz si sigue siendo requerido por el flujo de Codex, salvo instruccion explicita contraria.
- Reemplazar `PLAN HAIKY` visible en comentarios runtime por `Nomina-Ec` sin alterar nombres de planes/documentacion interna.
- No renombrar DB, usuario Render ni recursos productivos sin plan/rollback.
- Agregar contratos/scripts que eviten reintroducir `CODEX_CONTEXT.md` en raiz y PDF/logs placeholder.
- Crear reporte de fase.
- Commit esperado: `phase: ANV1-02 task: seguridad naming`.

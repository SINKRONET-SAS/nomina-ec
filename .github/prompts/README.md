# Prompts HAIKY por fase - nomina-ec

Estos prompts ejecutan `docs2/PLAN_HAIKY_NOMINA_EC_REVISADO.md` y `docs2/PLAN_HAIKY_RIESGOS_RESIDUALES.md` sobre el stack real del repositorio.

Reglas:

1. Leer `RULES.md`.
2. Leer `.vscode/AuditLock.json`.
3. No iniciar una fase si la anterior no esta firmada.
4. Ejecutar solo la fase aprobada.
5. Actualizar `AuditLock.json` al cerrar cada fase.
6. Validar UTF-8 sin BOM.
7. Commit con `phase: <X>` y `task: <Y.Z>`.

La referencia Base44 de `docs2/Plan_HAIKY_nomina_ec.md` queda adaptada a Express/PostgreSQL/Prisma/Render.

Fases de cierre residual:

- Fase 17: validacion legal Ecuador 2026.
- Fase 18: migracion AWS SDK v2 a v3.
- Fase 19: prueba RLS en Render con usuario no superusuario.

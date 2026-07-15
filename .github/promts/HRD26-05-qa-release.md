# HRD26-05 QA release

Base: `RULES.md` y fases HRD26-00 a HRD26-04 firmadas.

Objetivo: ejecutar gates finales, firmar AuditLock, hacer commit y push.

Comandos:

- `npm run haiky:reportes:2026`
- `git diff --check`
- `git status --short`
- `git add`
- `git commit -m "feat(reportes): matriz de novedades y auditoria Haiky" -m "phase: HRD26" -m "task: HRD26.05"`
- `git push origin main`

Condiciones de cierre:

- Todos los checks deben pasar o quedar documentados como bloqueo real.
- `.vscode/AuditLock.json` debe contener `phaseCompleted`, `filesModified`, `validationChecks` y `signature`.
- No dejar cambios sin versionar despues del push.

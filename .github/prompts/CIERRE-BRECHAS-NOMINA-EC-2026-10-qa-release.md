# CBN26-10 - QA y cierre de brechas

Actua bajo `RULES.md`.

Objetivo: cerrar CBN26 con regresion integral y evidencia de que los bugs criticos, decorativos y de arquitectura quedaron resueltos o bloqueados con causa.

Tareas:
- Ejecutar matriz de regresion PDF, nomina, beneficios, marcaciones, empresas, planes, parametros legales y rendimiento.
- Ejecutar backend tests, frontend build y validaciones aplicables.
- Actualizar reportes finales y riesgo residual.
- Crear `docs/REPORTE_CBN26_10_QA_RELEASE.md`.
- Actualizar `.vscode/AuditLock.json` con cierre final.

Validaciones:
- `npm test` backend o equivalente del repo.
- `npm run build` frontend.
- `git diff --check`.
- UTF-8 sin BOM.

No hacer:
- No marcar release productivo si quedan gates P0 abiertos.

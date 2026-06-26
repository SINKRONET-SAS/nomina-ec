# ANV2-06 QA y release

Objetivo: cerrar ANV2 con evidencia.

Instrucciones:
- Ejecutar `npm run contracts`, `npm run prisma:validate`, `npm run test:backend`, `npm run build:web`, `npm run check:mobile` y `git diff --check`.
- Ejecutar smokes de email, timezone, documentos, login/refresh y reportes.
- Actualizar reporte de cierre ANV2, `.github/CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.
- Confirmar que no existe `CODEX_CONTEXT.md` sensible en raiz.
- Registrar riesgos residuales: credenciales de correo reales, revision legal profesional y proveedor externo.
- Commit esperado: `phase: ANV2-06 task: qa release`.

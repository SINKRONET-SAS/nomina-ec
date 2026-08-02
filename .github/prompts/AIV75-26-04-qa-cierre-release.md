# AIV75-26-04 — QA, cierre y publicación

Requiere aprobación explícita y `AIV75-26-03` firmado.

Ejecuta contratos, Prisma validate, Jest backend completo, build frontend, gate móvil, comprobación UTF-8 sin BOM y `git diff --check`. Revisa expresamente que `render.yaml` no reactive el cron general ni cálculo automático de nómina.

Actualiza el plan, `CODEX_CONTEXT.md` y `.vscode/AuditLock.json` con archivos y resultados reales. Separa evidencia local de evidencia operacional Render. No declares `completed-pass` sin una corrida verificable del cron fiscal o registra el cierre como bloqueado de despliegue.

Commit requerido: `phase: AIV75-26-04 task: cerrar correccion auditoria V75`. Publica únicamente después de confirmar rama y diff final.

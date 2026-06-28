# Runbook CDANV5 QA Release

## Gates

1. `npm.cmd --workspace=backend test -- app.routes.test.js reporteController.test.js payphoneGatewayService.test.js --runInBand`
2. `npm.cmd run prisma:validate`
3. `npm.cmd --workspace=frontend-web run build`
4. `npm.cmd run check:mobile`
5. `git diff --check`

## Smoke manual

- PWA: Nomina > Reportes > Reportes internos de nomina > "Consolidado anual".
- Mobile: Movilizacion > Agregar gasto > verificar ruta sugerida editable.
- Pagos: confirmar que retorno GET solo informa estado y Confirmation API activa pagos reales.

## Criterios de cierre

- AuditLock firmado con CDANV5-05.
- Contexto actualizado en `.github/CODEX_CONTEXT.md`.
- Commit contiene `phase: CDANV5-05 task: cierre-v5`.

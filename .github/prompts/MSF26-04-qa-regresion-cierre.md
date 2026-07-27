# MSF26-04 — QA, regresion y cierre AuditLock

## Objetivo
Verificar que todos los archivos modificados pasan `node --check`, ejecutar suite de tests completa, verificar que no hay regresiones, y cerrar el plan MSF26.

## Verificaciones

### 1. Sintaxis
- `node --check` para todos los archivos .js modificados en MSF26

### 2. Tests
- Ejecutar `npx jest --forceExit --detectOpenHandles` (suite completa)
- Verificar que no hay regresiones respecto a la linea base (65 suites / 442 tests de RFI26)
- Verificar que los tests nuevos de MSF26 pasan

### 3. Archivos modificados esperados
- `backend/src/config/cron-jobs.js`
- `backend/src/services/subscriptionLifecycleService.js` (NUEVO)
- `backend/src/services/subscriptionLifecycleService.test.js` (NUEVO)
- `backend/src/services/fiscalInvoiceService.js`
- `backend/src/controllers/paymentController.js`
- `backend/src/app.js`
- `docs2/PLAN_HAIKY_MONETIZACION_AUTOMATICA_2026.md`
- `.github/CODEX_CONTEXT.md`
- `.github/prompts/MSF26-00` a `MSF26-04`
- `.vscode/AuditLock.json`

### 4. Cierre
- Actualizar CODEX_CONTEXT.md con todas las fases completed-pass
- Actualizar AuditLock.json con status closed, firma SHA256
- Commit con `phase: MSF26-04 task: MSF26-04-FINAL`

## Criterio de cierre
- `node --check` PASS para todos los archivos modificados
- Tests PASS sin regresiones
- AuditLock firmado y cerrado

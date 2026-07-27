# MSF26-01 — Cron de renovacion automatica y notificacion de vencimiento

## Objetivo
Implementar cron jobs para: (1) renovar automaticamente suscripciones con `renovacion_automatica = true` proximas a vencer, y (2) notificar al owner por email 7 dias antes del vencimiento.

## Hallazgos que resuelve
- M01: No hay cron de renovacion automatica (CRITICA)
- M02: No hay notificacion de vencimiento proximo (ALTA)

## Archivos a modificar
- `backend/src/config/cron-jobs.js` — agregar 2 crons nuevos
- `backend/src/services/subscriptionLifecycleService.js` — NUEVO: logica de renovacion y notificacion
- `backend/src/services/subscriptionLifecycleService.test.js` — NUEVO: tests

## Especificacion tecnica

### Cron 1: Renovacion automatica
- Schedule: `0 6 * * *` (diario 6am Ecuador)
- Query: suscripciones con `renovacion_automatica = true AND estado = 'active' AND vence_en <= NOW() + INTERVAL '1 day'`
- Accion: extender `vence_en` un billing period (mensual o anual segun metadata)
- Log: `CRON_SUBSCRIPTION_RENEWED` con tenantId, planId, nuevaFechaVencimiento
- Nota: no cobra automaticamente, solo extiende — el cobro requiere integracion futura con PayPhone recurrente

### Cron 2: Notificacion de vencimiento proximo
- Schedule: `0 9 * * *` (diario 9am Ecuador)
- Query: suscripciones con `estado = 'active' AND renovacion_automatica = false AND vence_en BETWEEN NOW() AND NOW() + INTERVAL '7 days'`
- Accion: enviar email al owner del tenant con fecha de vencimiento y link a renovar
- Usar `communicationService.sendEmail` existente
- Log: `CRON_SUBSCRIPTION_EXPIRY_NOTICE` con tenantId, diasRestantes
- Proteccion: no enviar mas de un aviso por periodo de vencimiento (usar metadata o tabla)

## Criterio de cierre
- Crons registrados en `cron-jobs.js`
- Tests de `subscriptionLifecycleService` pasan
- `node --check` PASS para archivos modificados

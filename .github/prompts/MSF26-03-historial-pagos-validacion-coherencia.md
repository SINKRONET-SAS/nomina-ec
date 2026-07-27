# MSF26-03 — Historial de pagos para tenant y validacion coherencia monto-plan

## Objetivo
(1) Crear endpoint para que el owner vea su historial de transacciones de pago. (2) Agregar advertencia cuando una transferencia manual tiene monto inconsistente con el precio del plan.

## Hallazgos que resuelve
- M06: No hay historial de transacciones para el tenant (MEDIA)
- M07: No hay validacion coherencia monto vs plan en transferencia manual (MEDIA)

## Archivos a modificar
- `backend/src/controllers/paymentController.js` — agregar `paymentHistory` handler
- `backend/src/app.js` — registrar ruta `/api/pagos/historial`
- `backend/src/controllers/paymentController.js` — agregar advertencia en `createManualBankTransfer`

## Especificacion tecnica

### Endpoint: Historial de pagos
- Ruta: `GET /api/pagos/historial`
- Auth: `authenticateToken` (cualquier usuario autenticado)
- Query: `transacciones_pago WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`
- Response: lista normalizada con id, planId, planNombre, estado, montoCentavos, moneda, proveedor, createdAt
- No exponer metadata interna ni datos de otros tenants

### Validacion coherencia monto-plan
- En `createManualBankTransfer`, comparar `amountCentavos` con `expectedPlanAmountCentavos`
- Si difiere mas de 20%: agregar campo `amountWarning` en respuesta con mensaje descriptivo
- No bloquear la operacion (es decision del superadmin), solo advertir

## Criterio de cierre
- Endpoint `/api/pagos/historial` funcional
- Ruta registrada en `app.js`
- Advertencia de monto incluida en respuesta de `createManualBankTransfer`
- `node --check` PASS para archivos modificados

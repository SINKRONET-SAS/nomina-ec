# Reporte CDANV2-05 - Cierre mensual

Fecha: 2026-06-27.

Resultado: completado.

## Cambios

- `cerrarMes()` abre cliente transaccional con contexto tenant/usuario.
- El periodo se bloquea con `SELECT ... FOR UPDATE` antes de cerrar roles.
- El cierre de nominas, descuentos de beneficios, actualizacion de periodo y lectura de empleados quedan dentro de la transaccion.
- Si el periodo cambia y ya no esta `calculated`, se revierte y responde 409.
- Notificaciones y auditoria se ejecutan despues del commit para no mantener la transaccion abierta durante envio externo.

## Pruebas

- `npm.cmd test -- auth.test.js communicationAuditService.test.js nominaController.test.js --runInBand`: PASS.
- `node --check src/controllers/nominaController.js`: PASS.


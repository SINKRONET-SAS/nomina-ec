# Reporte CDAN26-07 - Comunicaciones de rol de pago

## Cierre

Se agrego `sendRolPagoDisponible()` y se conecto al cierre mensual:

- Al cerrar nominas borrador se intenta notificar a cada empleado con correo personal.
- Cada intento queda en auditoria de comunicaciones.
- Si SMTP no esta configurado, no se simula exito productivo; se registra estado no configurado o fallo.
- La respuesta del cierre incluye `notificacionesRolPago`.

## Archivos principales

- `backend/src/services/communicationService.js`
- `backend/src/controllers/nominaController.js`

## Validacion

- `communicationService.test.js`
- `nominaController.test.js`


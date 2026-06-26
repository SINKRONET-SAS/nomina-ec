# Reporte ANV2-02 - Comunicaciones reales

## Objetivo

Cerrar EMAIL-C01 sin simular entrega comercial. El sistema debe distinguir proveedor real, modo desarrollo y bloqueo productivo.

## Cambios runtime

- `backend/src/services/communicationService.js`
  - Agrega `COMMUNICATION_PROVIDER`, `COMMUNICATION_DEV_MODE` y `COMMUNICATION_REQUIRE_REAL_PROVIDER`.
  - Expone `ready`, `deliveryMode`, `devMode`, `productionBlocked` y `realProviderRequired` en `/api/comunicaciones/status`.
  - Cambia el fallback dev implicito por modo desarrollo explicito y deshabilitado siempre en `NODE_ENV=production`.
  - Si un correo requerido se ejecuta sin SMTP real en produccion, registra auditoria y falla con `COMM_SMTP_NOT_CONFIGURED`.
- `backend/.env.example`
  - Documenta proveedor, modo dev y exigencia de proveedor real.
- `render.yaml`
  - Declara `COMMUNICATION_PROVIDER=smtp`, `COMMUNICATION_DEV_MODE=false` y `COMMUNICATION_REQUIRE_REAL_PROVIDER=true` para produccion.
- `backend/src/services/communicationService.test.js`
  - Cubre entrega dev explicita, envio SMTP real y bloqueo productivo sin credenciales.

## Resultado

EMAIL-C01 queda cerrado en backend. La fase ANV2-05 debe exponer estos nuevos estados en la PWA para que soporte/owner no confunda `development_log` con entrega real.

## Pruebas

- `npm.cmd --workspace=backend test -- communicationService.test.js`: OK.

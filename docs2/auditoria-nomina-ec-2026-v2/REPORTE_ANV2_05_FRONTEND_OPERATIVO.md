# Reporte ANV2-05 - Frontend operativo

## Objetivo

Exponer en la PWA los cierres ANV2 para que el usuario operativo distinga funcionalidad real, modo desarrollo y documentos incompletos.

## Cambios runtime

- `frontend-web/src/pages/Configuracion/Comunicaciones.jsx`
  - Muestra `deliveryMode`: SMTP real, `development_log`, `blocked` o `disabled`.
  - Muestra `productionBlocked` y advertencia roja cuando no hay proveedor real.
  - Conserva accion de prueba SMTP sin exponer secretos.
- `frontend-web/src/pages/Documentos/ContratosGenerados.jsx`
  - Agrega control visible de firmas.
  - Lista si el documento tiene representante/trabajador o si el representante esta incompleto.
- `frontend-web/src/pages/Documentos/ActasEntregaDotacion.jsx`
  - Agrega control visible de firmas en actas.
  - Muestra estado de representante legal/delegado por documento.
- `backend/src/services/communicationService.js`
  - Ajusta estado WhatsApp deshabilitado como `disabled`, no como bloqueo productivo.
- `scripts/verify-system-contracts.mjs`
  - Agrega contratos para estados de comunicaciones y firma visible en documentos.

## Resultado

ANV2-05 queda cerrado: EMAIL-C01, TZ-C01 y LEG-H01 ya no quedan solo como backend; sus estados aparecen en pantallas operativas.

## Pruebas

- `npm.cmd run contracts`: OK.
- `npm.cmd --workspace=backend test -- communicationService.test.js`: OK.
- `npm.cmd run build:web`: OK.

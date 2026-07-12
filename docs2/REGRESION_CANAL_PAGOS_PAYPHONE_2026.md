# Revision de regresion - canal principal de pagos PayPhone 2026

Fecha: 2026-07-12.

## Hallazgo

La landing mostraba el aviso:

`Los pagos directos estan deshabilitados. La activacion se realiza por transferencia bancaria revisada por SUPERADMIN.`

El mensaje venia de `backend/src/controllers/paymentController.js`: si `DIRECT_PAYMENTS_ENABLED` o `PAYPHONE_CHECKOUT_ENABLED` no estaban definidos, el backend devolvia `manual_transfer_only` antes de evaluar `PAYMENT_PROVIDER=payphone`, credenciales PayPhone, `PAYPHONE_MOCK_MODE=false` y `BACKEND_PUBLIC_URL`.

Esto era una regresion porque la configuracion productiva y la documentacion del repo mantienen PayPhone como canal principal de pagos. La transferencia bancaria manual existe, pero debe ser contingencia explicita.

## Correccion aplicada

- `PAYMENT_PROVIDER=payphone` vuelve a habilitar el flujo PayPhone por defecto.
- `DIRECT_PAYMENTS_ENABLED=false`, `PAYPHONE_CHECKOUT_ENABLED=false` o `PAYMENT_PROVIDER=manual_transfer` mantienen el modo de transferencia manual.
- `render.yaml` declara `DIRECT_PAYMENTS_ENABLED=true` para que produccion no dependa de un default implicito.
- `backend/.env.example` documenta PayPhone como canal principal y el apagado manual como contingencia.
- La landing ya no asume transferencia manual si PayPhone falla por configuracion; muestra un fallback generico de checkout no disponible.

## Gates ejecutados

- `npm.cmd --workspace=backend test -- paymentController.test.js --runInBand`: PASS, 8 tests.
- `npm.cmd run contracts`: PASS.
- `npm.cmd --workspace=frontend-web run build`: PASS.

## Riesgo residual

PayPhone real sigue requiriendo `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID` y `BACKEND_PUBLIC_URL` publico HTTPS. Si faltan, el sistema debe bloquear checkout con razon de configuracion, no caer silenciosamente a transferencia bancaria.

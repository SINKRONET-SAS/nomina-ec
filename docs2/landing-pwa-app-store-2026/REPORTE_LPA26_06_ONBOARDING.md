# LPA26-06 - Registro y onboarding comercial

## Resultado

Se reforzo el flujo comercial OWNER y el acceso inicial para reducir friccion: registro con consentimiento LOPDP versionado, login con errores normalizados, recuperacion limpia y validaciones locales de app movil vigentes.

## Cambios implementados

- Registro OWNER envia `lopdpConsent` con version `LOPDP-2026-06` y timestamp.
- Mensajes visibles de registro, login y recuperacion corregidos sin mojibake.
- AuthContext centraliza mensajes de credenciales invalidas, correo no verificado, tenant suspendido, plan vencido y consentimiento requerido.
- Rutas de registro, login y recuperacion verificadas sin enviar formularios ni crear datos reales.

## Validaciones

- `npm.cmd run build` en `frontend-web`: PASS.
- `node --check backend/src/controllers/authController.js`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- Smoke navegador:
  - `/registro`: 11 campos, 3 botones, version `LOPDP-2026-06`, sin mojibake.
  - `/login`: 2 campos, 3 botones, sin mojibake.
  - `/recuperar-password`: 3 campos, 4 botones, sin mojibake.

## Riesgos residuales

- No se envio un registro real porque no corresponde crear datos productivos en smoke local.
- Verificacion de correo y estados de plan dependen de backend y correo productivo.
- El onboarding interno de parametrizacion queda cubierto por la linea base previa, pero requiere QA visual final en LPA26-07.

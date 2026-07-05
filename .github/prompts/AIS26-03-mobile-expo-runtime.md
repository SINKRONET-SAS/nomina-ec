# AIS26-03 - Mobile Expo runtime

Objetivo: hacer visible el icono real de SKNOMINA dentro de la app movil y declarar assets de sistema en Expo.

Tareas:

- Actualizar `app-movil/app.json` con `splash` y `notification`.
- Mostrar `app-movil/assets/icon.png` en `LoginScreen`.
- Corregir mojibake visible en textos tocados del login movil.
- Ampliar `app-movil/scripts/check-store-readiness.mjs` para validar referencias y dimensiones.

Validacion:

- `npm.cmd run check:mobile`
- `node --check app-movil/src/screens/LoginScreen.js`

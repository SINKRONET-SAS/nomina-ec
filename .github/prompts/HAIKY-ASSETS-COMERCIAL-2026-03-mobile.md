# HAIKY-ASSETS-COMERCIAL-2026-03 - Mobile

Objetivo: homologar launcher, adaptive icon, notification y splash mobile con la misma fuente SKNOMINA.

Reglas:
- No romper Expo SDK 57 ni `expo-splash-screen`.
- No reintroducir `expo.notification` legacy.
- Mobile debe usar assets reales, no placeholders de tienda.

Tareas:
- Validar `app-movil/assets/icon.png`, `adaptive-icon.png`, `notification-icon.png` y `splash.png`.
- Revisar `app-movil/app.json`.
- Ejecutar store readiness.

Cierre:
- `npm.cmd run check:mobile`.
- Contratos root en verde.

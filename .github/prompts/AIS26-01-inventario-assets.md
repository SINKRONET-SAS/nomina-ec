# AIS26-01 - Inventario de assets

Objetivo: confirmar fuente canonica y dimensiones reales de iconos SKNOMINA.

Tareas:

- Revisar assets PWA en `frontend-web/public`.
- Revisar assets Expo en `app-movil/assets`.
- Corregir `icon-192.png` a 192x192 si no coincide.
- Corregir `icon-512.png` a 512x512 si no coincide.
- Generar `apple-touch-icon.png` de 180x180 desde el icono de sistema.

Validacion:

- Medir cabecera PNG para `icon-192.png`, `icon-512.png` y `apple-touch-icon.png`.
- No reemplazar `app-movil/assets/icon.png`, que debe conservar formato launcher de Expo.

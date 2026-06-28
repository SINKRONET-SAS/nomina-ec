# REPORTE CDANV6-07 - PWA MASKABLE

## Resultado

Estado: `completed_local`

Se agregaron iconos PNG maskable 192/512 y se referenciaron desde `frontend-web/pwa.config.js`.

## Assets

- `frontend-web/public/icon-192-maskable.png`
- `frontend-web/public/icon-512-maskable.png`

## Verificacion

- Build web generado con `dist/manifest.webmanifest`.
- El manifest incluye `/icon-192-maskable.png` y `/icon-512-maskable.png` con `purpose: maskable`.
- `npm.cmd --workspace=frontend-web run build`: PASS.

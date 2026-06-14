# LPA26-03 - PWA instalable y segura

## Resultado

La PWA fue reforzada para instalabilidad y seguridad operacional en datos de nomina. El manifest queda en `es-EC`, con icono maskable, apple touch icon, screenshots, shortcuts y service worker sin cache de API.

## Cambios implementados

- `frontend-web/pwa.config.js` actualizado con textos sin mojibake, screenshots y `NetworkOnly` para `/api`.
- `frontend-web/vite.config.js` incluye assets PWA adicionales en el build.
- Assets versionados agregados:
  - `frontend-web/public/apple-touch-icon.svg`
  - `frontend-web/public/pwa-screenshot-wide.svg`
  - `frontend-web/public/pwa-screenshot-mobile.svg`
- Etiquetas accesibles corregidas en `icon.svg` y `maskable-icon.svg`.
- Smoke PWA agregado en `frontend-web/scripts/smoke-pwa-lpa26.mjs`.
- Script `npm.cmd run smoke:pwa` agregado.

## Validaciones

- `npm.cmd run smoke:pwa` ejecutado con resultado exitoso.
- El smoke ejecuta build, valida `manifest.webmanifest`, valida screenshots, shortcuts, icono maskable y assets en `dist`.
- El smoke valida que `sw.js` contenga `NetworkOnly` para `/api`.
- El smoke bloquea indicios de `localStorage`, `sessionStorage`, empleados, banco, RUC o geolocalizacion dentro del service worker.

## Riesgos residuales

- Los screenshots son assets SVG de demo. Para tiendas se requieren PNG finales en LPA26-04.
- La sesion web todavia usa `localStorage`; queda como riesgo operacional a tratar fuera del service worker y con controles LOPDP/onboarding.

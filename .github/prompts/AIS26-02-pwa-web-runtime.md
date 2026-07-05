# AIS26-02 - PWA y web runtime

Objetivo: hacer que navegador, PWA y marca visible usen la imagen de sistema.

Tareas:

- Actualizar `frontend-web/index.html` con favicon SVG, PNG fallback, apple touch, manifest y metadatos sin mojibake.
- Actualizar `frontend-web/pwa.config.js` para declarar iconos PNG y shortcuts consistentes.
- Actualizar `frontend-web/vite.config.js` para incluir `apple-touch-icon.png`.
- Actualizar `frontend-web/src/components/Brand/BrandLogo.jsx` para usar `/icon-512.png` y fallback `/icon.svg`.

Validacion:

- `npm.cmd --workspace=frontend-web run smoke:pwa`
- `npm.cmd run build:web`

# HAIKY-ASSETS-COMERCIAL-2026-02 - Landing y PWA

Objetivo: conectar logo real, favicon, Open Graph, manifest, screenshots y smoke PWA.

Reglas:
- Landing debe mostrar marca/producto en el primer viewport.
- La pestana superior debe usar favicons PNG generados desde SKNOMINA; no priorizar `/icon.svg`.
- No usar screenshots ficticios SVG como manifest principal.
- No crear hero decorativo que oculte el producto.

Tareas:
- Actualizar `BrandLogo`, landing, `index.html`, `pwa.config.js`, `vite.config.js`.
- Actualizar smoke PWA para validar assets comerciales.
- Validar `favicon-32.png`, `favicon-48.png` y `favicon-64.png`.
- Verificar que el build copie `/brand/*`.

Cierre:
- `npm.cmd --workspace=frontend-web run smoke:pwa`.
- `npm.cmd run contracts`.

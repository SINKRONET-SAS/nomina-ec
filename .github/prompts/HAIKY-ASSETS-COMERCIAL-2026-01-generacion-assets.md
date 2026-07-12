# HAIKY-ASSETS-COMERCIAL-2026-01 - Generacion de assets

Objetivo: generar todos los formatos desde la fuente real `SKNOMINA_LOGO.png`.

Reglas:
- La solucion debe ser JS reproducible.
- Conservar hashes de fuente y derivados.
- No descargar dependencias ni usar assets externos no aprobados.

Tareas:
- Ejecutar `npm.cmd run brand:assets:solution`.
- Confirmar `assets/brand/manifest.json`.
- Confirmar dimensiones PWA, social, favicon de pestana y mobile.

Cierre:
- 18 assets generados.
- `npm.cmd run audit:brand-assets` en verde.

# HAIKY-ASSETS-COMERCIAL-2026-00 - Baseline

Objetivo: reconfirmar estado de marca, assets y regresion visual antes de generar cambios.

Reglas:
- Aplicar `RULES.md`: UTF-8 sin BOM, cero fallos silenciosos y evidencia antes de reportar.
- No borrar assets legacy sin `rg` que confirme cero referencias.
- No reemplazar logo por dibujos, placeholders ni SVG manual como fuente primaria.

Tareas:
- Ejecutar `git status --short --branch`.
- Inspeccionar `frontend-web/public`, `app-movil/assets` y fuentes en `assets/brand/source`.
- Ejecutar `npm.cmd run audit:brand-assets`.
- Registrar si hay placeholders, screenshots ficticios, favicon no homologado o dimensiones incorrectas.

Cierre:
- Diagnostico JSON/Markdown en `docs2/auditoria-assets-comercial-haiky-2026`.
- Hallazgos clasificados como confirmado, controlado o pendiente.

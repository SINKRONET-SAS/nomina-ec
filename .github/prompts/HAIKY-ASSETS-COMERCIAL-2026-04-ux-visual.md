# HAIKY-ASSETS-COMERCIAL-2026-04 - UX visual

Objetivo: capturar LANDING y login en desktop/mobile y corregir riesgos visibles sin generar regresiones.

Reglas:
- Toda conclusion UI/UX debe anclarse a captura actual.
- Toda correccion debe distinguir hallazgo real de falso positivo de captura o hidratacion.
- No afirmar cumplimiento WCAG completo desde screenshots.
- No modificar flujos de negocio por una correccion visual.

Tareas:
- Capturar landing desktop, login desktop, landing mobile y login mobile.
- Revisar uso de logo, favicon, jerarquia, CTAs, overflow y bloqueo por banners.
- Corregir obstrucciones visuales confirmadas.
- Ejecutar `npm.cmd run audit:brand-visual` contra preview productivo.

Cierre:
- Evidencia en `docs2/auditoria-assets-comercial-haiky-2026/evidencia-visual`.
- `VISUAL_QA.md` en PASS.
- Informe actualizado con limites de evidencia.

# Informe de diagnostico - Assets comerciales y UI/UX Haiky 2026

Fecha: 2026-07-12.

## Resultado ejecutivo

La auditoria reconfirmo una regresion comercial: los assets activos de PWA y mobile mostraban el placeholder `Nomina-Ec / datos ficticios para tienda`, y la pestana superior del navegador seguia priorizando un favicon SVG legacy no homologado con SKNOMINA. Se corrigio usando la fuente real `SKNOMINA_LOGO.png`, se definieron formatos/tamanos para PWA, social, favicon y mobile, y se agregaron scripts JS para regenerar, capturar y validar los assets.

## Evidencia visual

Capturas aceptadas en `docs2/auditoria-assets-comercial-haiky-2026/evidencia-visual`:

1. `01-landing-desktop.png`: landing desktop con logo SKNOMINA en header, hero y panel comercial.
2. `02-login-desktop.png`: login desktop con marca SKNOMINA y formulario legible.
3. `03-landing-mobile.png`: landing mobile con logo visible, CTAs sin desborde y banner de cookies compacto.
4. `04-login-mobile.png`: login mobile con marca SKNOMINA, formulario legible y banner inferior compacto.

`VISUAL_QA.md` registra PASS en landing/login desktop/mobile, logo visible y `0px` de overflow horizontal en cada escenario.

## Hallazgos y cierre

| ID | Estado | Resolucion |
|----|--------|------------|
| HAIKY-ASSET-01 | Cerrado | `icon-192`, `icon-512`, maskable, apple touch, mobile launcher, notification y splash regenerados desde `SKNOMINA_LOGO.png`. |
| HAIKY-ASSET-02 | Cerrado | `BrandLogo` usa `/brand/sknomina-logo-512.png`; fallback PNG generado. |
| HAIKY-ASSET-03 | Cerrado | PWA manifest usa screenshots PNG de marca y Vite los incluye en build. |
| HAIKY-ASSET-04 | Cerrado | Open Graph/Twitter usan `/brand/sknomina-og.png` 1200x630. |
| HAIKY-ASSET-05 | Cerrado | La pestana superior usa favicons PNG oficiales `32x32`, `48x48` y `64x64`; `/icon.svg` deja de ser favicon principal. |
| HAIKY-UX-01 | Cerrado | Cookie banner reducido para no dominar mobile ni bloquear CTA/login. |
| HAIKY-UX-02 | Cerrado | Header mobile ajustado para conservar logo oficial y evitar overflow horizontal en `390px`. |

## Checks automatizados

- `npm.cmd run brand:assets:solution`: genera 18 assets y manifiesto.
- `npm.cmd run audit:brand-assets`: PASS, sin hallazgos abiertos.
- `scripts/verify-system-contracts.mjs`: actualizado para bloquear regresiones de marca.
- `frontend-web/scripts/smoke-pwa-lpa26.mjs`: actualizado para validar assets comerciales en dist.
- `npm.cmd run audit:brand-visual`: PASS, 4 escenarios visuales sin overflow ni perdida de logo.

## Limites de evidencia

La auditoria visual cubre landing y login. No afirma cumplimiento WCAG completo; contraste, foco de teclado, lector de pantalla y zoom deben seguirse validando en QA accesible. La app mobile se valida por assets Expo y store readiness, no por render nativo en dispositivo fisico dentro de esta fase.

## Candidatos a eliminacion

- `frontend-web/public/pwa-screenshot-wide.svg` y `pwa-screenshot-mobile.svg`: conservar temporalmente como legacy no consumido; eliminar en una fase de limpieza si `rg` confirma cero referencias productivas.
- `frontend-web/public/icon.svg`, `maskable-icon.svg`, `apple-touch-icon.svg`: conservar como fallback legacy hasta decidir politica de SVG; no son fuente primaria.

## Conclusion

La propuesta no introduce regresion funcional: los assets quedan generados por script, referenciados por PWA/mobile, protegidos por contratos y documentados con hashes. El producto vuelve a presentar SKNOMINA como marca comercial desde el primer viewport.

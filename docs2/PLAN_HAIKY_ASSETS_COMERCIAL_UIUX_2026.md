# Plan Haiky - Assets comerciales, UI/UX y logo SKNOMINA 2026

Fecha: 2026-07-12.

## Alcance

Auditoria integral de imagen comercial y uso de assets en LANDING, PWA, BACKEND contracts y MOBILE para `C:\proyectos web\nuevo_nomina`. El objetivo es corregir la regresion visual donde los iconos publicados volvieron a mostrar `Nomina-Ec / datos ficticios`, normalizar formatos/tamanos, mejorar UI/UX sin regresiones y dejar scripts JS repetibles.

## Fuentes de marca

| Archivo fuente | Uso |
|----------------|-----|
| `assets/brand/source/SKNOMINA_LOGO.png` | Fuente canonica para SKNOMINA, PWA, launcher mobile, splash, social y screenshots. |
| `assets/brand/source/SINKRONET.png` | Fuente institucional de SINKRONET S.A.S para respaldo corporativo. |
| `assets/brand/source/SINKRONET-LOGO.jpg` | Variante JPG institucional conservada como referencia. |

## Hallazgos reconfirmados

| ID | Severidad | Estado | Hallazgo | Evidencia | Respuesta |
|----|-----------|--------|----------|-----------|-----------|
| HAIKY-ASSET-01 | Alta | Cerrado | `icon-512.png` y launcher mobile mostraban placeholder `Nomina-Ec / datos ficticios`. | Inspeccion visual inicial de `frontend-web/public/icon-512.png` y `app-movil/assets/icon.png`. | Regenerados desde `SKNOMINA_LOGO.png`. |
| HAIKY-ASSET-02 | Alta | Cerrado | La landing usaba logo pequeno, sin asset comercial fuerte en primer viewport. | Captura de landing y `BrandLogo` previo. | `HeroBrandAsset` usa `/brand/sknomina-logo-512.png`. |
| HAIKY-ASSET-03 | Media | Cerrado | Manifest PWA usaba screenshots SVG ficticios. | `frontend-web/pwa.config.js`. | Se reemplazan por PNGs de marca `1280x720` y `390x844`. |
| HAIKY-ASSET-04 | Media | Cerrado | Metadatos sociales usaban icono cuadrado en vez de imagen comercial 1200x630. | `frontend-web/index.html`. | Se agrega `/brand/sknomina-og.png`. |
| HAIKY-ASSET-05 | Alta | Cerrado | La pestana superior del navegador priorizaba `/icon.svg`, un favicon legacy no homologado con el logo SKNOMINA. | Captura enviada por usuario y `frontend-web/index.html`. | Se generan y enlazan `favicon-32.png`, `favicon-48.png` y `favicon-64.png` desde la fuente oficial. |
| HAIKY-UX-01 | Media | Cerrado | Banner de cookies tapaba contenido y controles en mobile. | Capturas `03-landing-mobile.png` y `04-login-mobile.png`. | Copy reducido y botones compactos. |
| HAIKY-UX-02 | Media | Cerrado | Header mobile podia desbordarse al combinar marca completa y CTAs. | QA visual `390x1200`. | Header mobile conserva icono oficial y acorta "Crear cuenta" a "Crear" solo en ancho pequeno. |

## Formatos definidos

| Asset | Tamano | Ruta |
|-------|--------|------|
| Logo PWA | 512x512 PNG | `frontend-web/public/brand/sknomina-logo-512.png` |
| Logo alta resolucion | 1024x1024 PNG | `frontend-web/public/brand/sknomina-logo-1024.png` |
| Open Graph / Twitter | 1200x630 PNG | `frontend-web/public/brand/sknomina-og.png` |
| Screenshot PWA wide | 1280x720 PNG | `frontend-web/public/brand/pwa-screenshot-wide.png` |
| Screenshot PWA mobile | 390x844 PNG | `frontend-web/public/brand/pwa-screenshot-mobile.png` |
| PWA icon | 192x192 y 512x512 PNG | `frontend-web/public/icon-*.png` |
| PWA maskable | 192x192 y 512x512 PNG | `frontend-web/public/icon-*-maskable.png` |
| Favicon browser tab | 32x32, 48x48 y 64x64 PNG | `frontend-web/public/favicon-*.png` |
| Apple touch | 180x180 PNG | `frontend-web/public/apple-touch-icon.png` |
| Mobile launcher | 1024x1024 PNG | `app-movil/assets/icon.png` |
| Mobile notification | 512x512 PNG | `app-movil/assets/notification-icon.png` |
| Mobile splash | 1242x2436 PNG | `app-movil/assets/splash.png` |

## Fases

| Fase | Prompt | Objetivo | Gate |
|------|--------|----------|------|
| 00 | `HAIKY-ASSETS-COMERCIAL-2026-00-baseline.md` | Congelar baseline, fuentes y regresion. | `npm.cmd run audit:brand-assets`. |
| 01 | `HAIKY-ASSETS-COMERCIAL-2026-01-generacion-assets.md` | Generar formatos desde fuente real con JS. | `npm.cmd run brand:assets:solution`. |
| 02 | `HAIKY-ASSETS-COMERCIAL-2026-02-landing-pwa.md` | Conectar landing, PWA, manifest, OG y smoke. | `npm.cmd --workspace=frontend-web run smoke:pwa`. |
| 03 | `HAIKY-ASSETS-COMERCIAL-2026-03-mobile.md` | Homologar launcher, notification y splash mobile. | `npm.cmd run check:mobile`. |
| 04 | `HAIKY-ASSETS-COMERCIAL-2026-04-ux-visual.md` | Capturar UI y corregir bloqueo visual mobile. | Evidencia en `evidencia-visual`. |
| 05 | `HAIKY-ASSETS-COMERCIAL-2026-05-qa-release.md` | Validacion final, AuditLock, commit y push. | `npm.cmd run validate`, `git diff --check`. |

## Scripts JS

- `scripts/haiky-brand-assets-solution.mjs`: genera assets PNG desde fuentes de marca y manifiesto SHA-256.
- `scripts/haiky-brand-assets-diagnostic.mjs`: valida dimensiones, contratos y uso en LANDING/PWA/MOBILE.
- `scripts/haiky-brand-assets-auditlock.mjs`: ejecuta gates de marca y firma `.vscode/AuditLock.json`, `.vscode/AudiLock.json` y `AuditLock.json`.
- `scripts/haiky-visual-regression-capture.mjs` (`npm.cmd run audit:brand-visual`): captura landing/login desktop/mobile con Edge CDP, valida logo visible y cero overflow horizontal.

## Anti regresion

No se aceptan assets de tienda con textos `Nomina-Ec`, `datos ficticios` o screenshots ficticios como fuente principal. Todo cambio de marca debe actualizar `assets/brand/manifest.json`, contratos, smoke PWA, app mobile y evidencia visual antes de commit.

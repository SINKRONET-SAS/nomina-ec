# Diagnostico assets comerciales Haiky 2026

Generado: 2026-07-12T19:23:41.845Z
Hash evidencia: 89c12f8c1740af7078c35435308808b05b37c74f02404fa2cd4e376406edb8f3

## Regresion reconfirmada

- frontend-web/public/icon-512.png mostraba placeholder Nomina-Ec / Datos ficticios para tienda antes de regenerar.
- frontend-web/index.html priorizaba /icon.svg como favicon, manteniendo un icono de pestana no homologado con SKNOMINA.
- app-movil/assets/icon.png mostraba placeholder Nomina-Ec / Datos ficticios para tienda antes de regenerar.
- Manifest PWA usaba screenshots SVG ficticios en vez de assets comerciales PNG.

## Checks de imagen

- PASS Fuente SKNOMINA entregada por usuario: assets/brand/source/SKNOMINA_LOGO.png esperado 1254x1254, actual 1254x1254
- PASS Logo comercial PWA: frontend-web/public/brand/sknomina-logo-512.png esperado 512x512, actual 512x512
- PASS Logo comercial alta resolucion: frontend-web/public/brand/sknomina-logo-1024.png esperado 1024x1024, actual 1024x1024
- PASS Imagen social Open Graph: frontend-web/public/brand/sknomina-og.png esperado 1200x630, actual 1200x630
- PASS Screenshot PWA wide: frontend-web/public/brand/pwa-screenshot-wide.png esperado 1280x720, actual 1280x720
- PASS Screenshot PWA mobile: frontend-web/public/brand/pwa-screenshot-mobile.png esperado 390x844, actual 390x844
- PASS Icono PWA 192: frontend-web/public/icon-192.png esperado 192x192, actual 192x192
- PASS Icono PWA 512: frontend-web/public/icon-512.png esperado 512x512, actual 512x512
- PASS Icono maskable 192: frontend-web/public/icon-192-maskable.png esperado 192x192, actual 192x192
- PASS Icono maskable 512: frontend-web/public/icon-512-maskable.png esperado 512x512, actual 512x512
- PASS Favicon browser tab 32: frontend-web/public/favicon-32.png esperado 32x32, actual 32x32
- PASS Favicon browser tab 48: frontend-web/public/favicon-48.png esperado 48x48, actual 48x48
- PASS Favicon browser tab 64: frontend-web/public/favicon-64.png esperado 64x64, actual 64x64
- PASS Apple touch icon: frontend-web/public/apple-touch-icon.png esperado 180x180, actual 180x180
- PASS Launcher mobile: app-movil/assets/icon.png esperado 1024x1024, actual 1024x1024
- PASS Adaptive icon mobile: app-movil/assets/adaptive-icon.png esperado 1024x1024, actual 1024x1024
- PASS Notification icon mobile: app-movil/assets/notification-icon.png esperado 512x512, actual 512x512
- PASS Splash mobile: app-movil/assets/splash.png esperado 1242x2436, actual 1242x2436

## Checks de contrato

- PASS BrandLogo usa logo comercial real (frontend-web/src/components/Brand/BrandLogo.jsx)
- PASS HTML publico usa assets comerciales en preload/social/favicon (frontend-web/index.html)
- PASS Manifest PWA usa screenshots PNG de marca (frontend-web/pwa.config.js)
- PASS Landing usa asset de marca en primer viewport (frontend-web/src/pages/Landing.jsx)
- PASS Mobile usa launcher generado desde la misma fuente (app-movil)
- PASS Manifiesto de marca registra hash de fuente SKNOMINA (assets/brand/manifest.json)

## Hallazgos automatizados abiertos

No quedan hallazgos automatizados abiertos en assets comerciales.

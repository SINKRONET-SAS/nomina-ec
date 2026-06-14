# LPA26-03 - PWA instalable y segura

Actua bajo `RULES.md`.

Objetivo: dejar PWA instalable y segura para datos de nomina.

Tareas:

- Validar AuditLock de `LPA26-02`.
- Validar manifest `es-EC`, iconos maskable, screenshots y shortcuts.
- Asegurar que service worker no cachee `/api` ni respuestas con datos laborales, bancarios, geolocalizacion o documentos.
- Crear smoke PWA inspirado en `sinkroniq-mobile/scripts/smoke-landing-pwa.js`.
- Validar offline shell sin datos personales.

Cierre:

- Build frontend exitoso.
- Manifest y `sw.js` validados.
- Smoke PWA documentado.
- AuditLock firmado para `LPA26-03`.
- Commit esperado: `phase: LPA26-03 task: pwa segura`.


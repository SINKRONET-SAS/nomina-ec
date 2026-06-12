# Fase 22 - PWA Nómina-Ec

Actua bajo `RULES.md`.

Objetivo: habilitar Nómina-Ec como PWA instalable, usando como referencia `sinkroniq-mobile/landing/pwa.config.js`.

Tareas:

- Validar AuditLock de fase 21.
- Integrar `vite-plugin-pwa` en la aplicacion web aprobada.
- Crear manifest con `name`, `short_name`, `description`, `lang: es-EC`, iconos maskable, screenshots y shortcuts.
- Configurar service worker para cachear shell/assets y evitar cache de datos personales de nomina.
- Configurar proxy `/api` mediante `VITE_PROXY_TARGET`.
- Crear assets PWA o documentar placeholders aprobados.

Cierre:

- Build PWA exitoso.
- Manifest validado.
- Service worker no cachea respuestas privadas sensibles.
- AuditLock firmado para fase 22.

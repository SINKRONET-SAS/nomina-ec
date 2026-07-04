# MRA26-02 - Gates backend app y rutas

Aplicar `RULES.md`, `.github/CODEX_CONTEXT.md` y el plan MRA26.

Objetivo: bloquear por plan las rutas PWA, app movil, rutas dentro de mobile y movilizacion cuando el tenant no tenga el canal comercial contratado.

Validar:

- `/api/rutas/*` exige `fieldRoutes`.
- `/api/mobile/*` exige `mobileApp`.
- `/api/mobile/ruta/*` exige `mobileApp` y `fieldRoutes`.
- `/api/movilizacion/*` exige `mobileApp`.
- El error usa `PLAN_CAPABILITY_BLOCKED`, status 402 y `correlationId`.

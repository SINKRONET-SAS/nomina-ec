# MRA26-01 - Modelo y capacidades de plan

Aplicar `RULES.md`, `.github/CODEX_CONTEXT.md` y el plan MRA26.

Objetivo: agregar canales monetizables `app_movil` y `rutas_campo` a `planes_comerciales`, exponerlos como `mobileApp` y `fieldRoutes`, y asegurar seeds/migracion coherentes.

Validar:

- Prisma schema valido.
- `planCapabilityService` retorna ambos canales.
- Gestion de planes backend normaliza, inserta, versiona y actualiza ambos campos.

# MRA26-03 - Frontend, contratos y QA release

Aplicar `RULES.md`, `.github/CODEX_CONTEXT.md` y el plan MRA26.

Objetivo: exponer los nuevos canales en Gestion de planes, catalogo publico, centro operativo, PWA de rutas y app movil. Cerrar con contratos automatizados, pruebas y AuditLock.

Validar:

- Superadmin puede activar App movil y Rutas de campo en Gestion de planes.
- Catalogo publico comunica la oferta del plan.
- PWA Rutas de campo muestra bloqueo comercial cuando el plan no concede acceso.
- `npm.cmd run contracts`, Prisma, pruebas backend, build web, check mobile, `git diff --check` y UTF-8 sin BOM pasan o quedan documentados.

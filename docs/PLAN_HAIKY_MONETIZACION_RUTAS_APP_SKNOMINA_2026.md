# PLAN HAIKY - MONETIZACION RUTAS Y APP SKNOMINA 2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-MONETIZACION-RUTAS-APP-SKNOMINA-2026 |
| Codigo | MRA26 |
| Estado | Ejecutado localmente |
| Requerimiento fuente | Tanto rutas como la app deben tener canal de monetizacion en Gestion de planes para que los planes que los ofrezcan concedan acceso a dicha funcionalidad. |
| Contexto | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/MRA26-00-baseline-documental.md` a `.github/prompts/MRA26-03-qa-release.md` |

## Objetivo

Cerrar definitivamente la brecha comercial y tecnica donde Rutas de campo y App movil existian como funcionalidad operativa, pero no estaban modeladas como capacidades monetizables dentro de Gestion de planes.

## Alcance funcional

- Agregar canales `app_movil` y `rutas_campo` al modelo de `planes_comerciales`.
- Exponer esos canales como capacidades `mobileApp` y `fieldRoutes`.
- Permitir que Superadmin los configure en Gestion de planes.
- Comunicar en el catalogo publico cuando un plan ofrece app movil o rutas.
- Bloquear backend con `402 PLAN_CAPABILITY_BLOCKED` cuando un tenant no tenga el canal contratado.
- Mostrar bloqueo claro en la PWA de Rutas de campo.
- Mantener versionado de planes existentes con suscripciones activas.

## Decisiones comerciales

- `TRIAL` y `MICRO` habilitan app movil para asistencia, permisos y autoservicio, pero no rutas de campo.
- `PYME`, `EMPRESA` y `CORPORATIVO` habilitan app movil y rutas de campo.
- El plan demo comercial queda con ambos canales habilitados para mantener la demo end-to-end.
- Rutas dentro de la app movil exigen ambos canales: `mobileApp` y `fieldRoutes`.

## Fases

| Fase | Prioridad | Entregable | Estado |
|------|-----------|------------|--------|
| MRA26-00 | P0 | Baseline documental, contexto y prompts | completed |
| MRA26-01 | P0 | Modelo de datos, migracion y capacidades de plan | completed |
| MRA26-02 | P0 | Gates backend para rutas, app y movilizacion | completed |
| MRA26-03 | P0 | Exposicion frontend, contratos y QA release | completed |

## Gates requeridos

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=backend test -- planCapabilityService.test.js app.routes.test.js paymentController.test.js --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- `git diff --check`
- Validacion UTF-8 sin BOM para archivos `.js`, `.jsx`, `.mjs`, `.md`, `.json` modificados.

## Criterio de cierre

El plan queda cerrado solo si Gestion de planes permite configurar ambos canales, el backend bloquea rutas/app cuando el plan no concede acceso, el frontend muestra el bloqueo comercial y los contratos automatizados verifican que la capacidad no desaparezca.

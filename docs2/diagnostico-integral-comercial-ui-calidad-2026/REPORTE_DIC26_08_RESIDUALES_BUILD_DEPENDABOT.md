# Reporte DIC26-08 - Residuales build y Dependabot

## Alcance

DIC26-08 cierra las dos notas residuales posteriores a DIC26-07:

- Warning Vite por chunk mayor a 500 kB.
- Vulnerabilidades reportadas por Dependabot/npm audit en la rama.

## Cambios runtime

| Area | Cambio | Resultado |
|------|--------|-----------|
| Frontend web | `manualChunks` en `frontend-web/vite.config.js` | Se separan React, HTTP, iconos, PWA y vendor. |
| Frontend web | Vite, plugin React y vite-plugin-pwa actualizados | Build usa `vite v7.3.5` y PWA `v1.3.0`. |
| Frontend web | Overrides de `esbuild` y `form-data` | `npm audit` queda limpio. |
| Backend | `fast-xml-parser`, `node-cron` y `uuid` actualizados | Generadores XML y cron mantienen compatibilidad verificada. |
| Backend | Overrides de `form-data`, `js-yaml` y `uuid` | Cierre de vulnerabilidades transitivas sin downgrade de Jest/ExcelJS. |
| App movil | Override de `form-data` | `npm audit` queda limpio. |

## Gates ejecutados

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Audit frontend | PASS | `npm.cmd audit --audit-level=low` en `frontend-web`: 0 vulnerabilidades. |
| Audit backend | PASS | `npm.cmd audit --audit-level=low` en `backend`: 0 vulnerabilidades. |
| Audit movil | PASS | `npm.cmd audit --audit-level=low` en `app-movil`: 0 vulnerabilidades. |
| Frontend build | PASS | `npm.cmd run build` en `frontend-web`: sin warning de chunk mayor a 500 kB; mayor JS runtime 221.95 kB. |
| PWA smoke | PASS | `npm.cmd run smoke:pwa`: manifest, assets y service worker cumplen. |
| Backend tests | PASS | `npm.cmd test -- --runInBand`: 20 suites, 78 tests. |
| App stores | PASS | `npm.cmd run check:stores`: configuracion, identificadores, URLs y assets verificados. |
| Expo doctor | PASS | `npm.cmd run doctor`: 21/21 checks. |
| node-cron API | PASS | `cron.schedule` disponible con `node-cron` 4.4.1. |

## Resultado

Las notas residuales quedan cerradas localmente. No se ejecuto `git push` por instruccion expresa del usuario; el cierre queda en commit local.

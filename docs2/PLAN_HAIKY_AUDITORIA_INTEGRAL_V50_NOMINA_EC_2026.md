# Plan Haiky - HAIKY-AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026 |
| Codigo | AIV50 |
| Estado | AIV50-00..08 ejecutadas localmente |
| Fase actual | AIV50-08 cerrada localmente |
| Alcance | cierre definitivo de hallazgos Auditoria Integral V50 sobre backend, legal Ecuador, mobile, PWA/frontend, deuda tecnica y candidatos a eliminacion |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Fuente de auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaIntegral2026V50.jsx` y `src/pages/v50/v50data.jsx` |
| Matriz | `docs2/auditoria-integral-v50-nomina-ec-2026/MATRIZ_AIV50_HALLAZGOS.md` |
| Runbook | `docs2/auditoria-integral-v50-nomina-ec-2026/RUNBOOK_AIV50_QA_CIERRE.md` |
| Reporte baseline | `docs2/auditoria-integral-v50-nomina-ec-2026/REPORTE_AIV50_00_BASELINE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

AIV50 convierte la Auditoria Integral V50 en una linea Haiky ejecutable para cerrar de forma definitiva los riesgos detectados en Nomina-Ec. El plan no aplica scripts de la auditoria de forma literal sin verificar el stack real; cada fase debe leer codigo, confirmar evidencia vigente, implementar el fix con reglas Haiky, exponer el avance en frontend cuando afecte operacion y cerrar con pruebas, rollback y AuditLock firmado.

## Hallazgo clave de contexto

El repositorio operativo ya no debe tratarse como `sinkroniq-mobile` de facturacion. El producto actual es `nomina-ec`, un sistema de nomina ecuatoriana con backend Express/PostgreSQL/Prisma, PWA React+Vite y app movil Expo para asistencia. Todo cierre debe preservar dominio laboral, LOPDP, parametros legales Ecuador y experiencia visible para OWNER/RRHH/empleado.

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| AIV50-00 | P0 | completed_documental | Baseline documental, matriz, prompts, contexto y AuditLock sin tocar runtime. |
| AIV50-01 | P0 | completed_local | Backend nomina y rendimiento: eliminar N+1 de parametros legales y agregar pruebas de regresion. |
| AIV50-02 | P0 | completed_local | Seguridad auth y carga: rate limit en login/forgot-password, SELECT explicito y validacion de `fotoBase64`. |
| AIV50-03 | P0 | completed_local | Parametros legales Ecuador: single source of truth, IESS 2026, tests y bloqueo profesional si falta fuente. |
| AIV50-04 | P0 | completed_local | App movil asistencia: permisos GPS fail-closed, estados fuera de zona y privacidad de marcacion. |
| AIV50-05 | P1 | completed_local | LOPDP y biometria: consentimiento de tratamiento, consentimiento separado para foto y retencion visible. |
| AIV50-06 | P1 | completed_local | PWA/frontend: Dashboard, ruta 404, interceptor 401 y mensajes legales/comerciales visibles. |
| AIV50-07 | P1 | completed_local | Arquitectura backend y deuda: rutas modulares, servicios de comunicacion, queryBuilder e identidad Ecuador. |
| AIV50-08 | P0 | completed_local | Limpieza controlada, QA integral, migraciones, rollback, AuditLock, commit y push. |

## Reglas AIV50

- No iniciar una fase funcional sin aprobacion explicita del prompt correspondiente.
- No adelantar tareas de fases posteriores, aunque el archivo afectado parezca cercano.
- Antes de tocar runtime en cada fase: leer `RULES.md`, `CODEX_CONTEXT.md`, `.vscode/AuditLock.json`, matriz AIV50 y estado git.
- Cada hallazgo debe verificarse contra codigo real antes de modificar; la auditoria V50 es evidencia de entrada, no parche ciego.
- No aceptar fallos silenciosos: errores con `code`, `statusCode`, `correlationId` y contexto seguro.
- Todo cambio backend con impacto operativo debe quedar visible o verificable en frontend/PWA/app movil.
- Parametros legales deben tener fuente, vigencia, responsable, fecha de carga y test.
- GPS, foto, cedula, salario y biometria se tratan como datos sensibles LOPDP.
- No eliminar `AutoservicioScreen.js` ni mover tests sin verificar imports, roadmap y configuracion de test runner.
- Commits esperados: `phase: AIV50-XX task: ...`.

## Entregables esperados

- Fix N+1 en calculo de nomina con prueba que garantice una sola carga de parametros legales por lote.
- Login y recuperacion con rate limit, query explicita, auditoria de intentos y mensajes anti-enumeracion.
- Validacion de foto base64 con limite, tipo permitido y error visible en app/backend.
- Fuente unica de parametros legales o puente de migracion con warnings, tests y bloqueo si hay divergencia.
- Marcacion movil con permisos GPS verificados al cargar, fail-closed y estado claro de fuera de zona.
- Consentimientos LOPDP versionados para tratamiento de datos, GPS y foto si aplica.
- PWA con 404, interceptor 401 y dashboard refactorizado sin romper navegacion.
- Backend con rutas modulares y servicios extraidos solo donde reduzcan riesgo real.
- Limpieza de candidatos a eliminacion con evidencia de no uso o reubicacion segura.

## Gates globales

- `npx.cmd prisma validate` en `backend`.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` y smoke PWA en `frontend-web`.
- `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil`.
- Gate UTF-8 sin BOM para `.js`, `.md`, `.json` modificados.
- Revision manual de rutas/navegacion afectadas.
- AuditLock firmado por fase.
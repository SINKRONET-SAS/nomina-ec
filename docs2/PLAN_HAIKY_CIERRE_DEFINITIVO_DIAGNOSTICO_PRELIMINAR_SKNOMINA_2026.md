# HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026

Codigo: `DPS26`
Fecha: 2026-07-03
Estado: `DPS26-00 documental creado; runtime pendiente de aprobacion por fase`

## Open Haiky Plan

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026 |
| Codigo | DPS26 |
| Fase actual | DPS26-00 baseline documental |
| Requerimiento fuente | Diagnostico preliminar de SINKRONET-SAS/nomina-ec sobre cumplimiento laboral, tributario, nomina, PWA, app movil, seguridad, reportes y mantenimiento. |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_DIAGNOSTICO_PRELIMINAR_SKNOMINA_2026.md` |
| Matriz | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/MATRIZ_DPS26_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/CONTRATO_DPS26_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/RUNBOOK_DPS26_QA_RELEASE.md` |
| Baseline | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/REPORTE_DPS26_00_BASELINE.md` |
| Prompts | `.github/prompts/DPS26-{00..10}-*.md` |
| Contexto | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` |

## Objetivo

Cerrar de forma gobernada el diagnostico preliminar de SKNOMINA 2026, convirtiendo los riesgos P0/P1/P2/P3 en fases verificables, con evidencia de codigo, pruebas, trazabilidad de cambios y visibilidad operativa cuando afecte al usuario.

## Alcance activo

DPS26 cubre el producto completo declarado por el repo: `backend`, `frontend-web`, `app-movil`, documentacion y despliegue. El foco es contrastar la promesa comercial y regulatoria contra el comportamiento real antes de aplicar cambios.

| Prioridad | Area | Cierre esperado |
|-----------|------|-----------------|
| P0 | Cumplimiento laboral Ecuador 2026 | Matriz legal versionada con evidencia por modulo, reglas auditables y pruebas de casos criticos. |
| P0 | Cumplimiento tributario aplicable | Tablas fiscales/versiones, casos de IR empleados y reportes SRI aplicables con validacion estructural. |
| P0 | Motor de nomina | Reglas puras, snapshots de calculo, redondeo definido, cierre inmutable y reversos controlados. |
| P0 | Inmutabilidad y auditoria | Invariantes de backend para marcaciones, nominas cerradas, recalculos, actor, fecha y contexto. |
| P1 | Landing vs producto real | Paridad entre oferta publica, backend, PWA y app, sin prometer funcionalidades incompletas. |
| P1 | Seguridad, tenant y datos sensibles | RLS activo, queries tenant-aware, cuentas bancarias cifradas, JWT seguro, documentos protegidos y logs sin PII. |
| P1 | PWA operativa | Flujos criticos con estados de carga, error, retry, vacio y bloqueo legal visible. |
| P1 | App movil GPS/foto | Permisos minimos, aviso LOPDP, manejo offline seguro y requisitos Android/iOS. |
| P0 | Reportes oficiales y exportables | RDEP, Formulario 107, batch IESS TXT y reportes internos validables contra formatos vigentes 2026, con snapshots y hash de salida. Supersedido por RPE26 para alcance IESS. |
| P2 | Dependencias y builds | Versiones soportadas, builds reproducibles y checks de mantenimiento. |
| P2 | Observabilidad | Logs estructurados, correlationId y alertas operativas. |
| P3 | Documentacion | Runbooks de soporte, release y auditoria. |

## Decisiones obligatorias

- No iniciar runtime sin aprobacion explicita de la fase.
- Aplicar `RULES.md` en cada archivo `.js`, `.md` y `.json`.
- Mantener `.github/CODEX_CONTEXT.md` como fuente de contexto operativa.
- No guardar secretos, tokens, URLs privadas, certificados ni credenciales en el repo.
- No prometer cumplimiento laboral, tributario o store-ready sin evidencia ejecutable.
- No cambiar SBU 2026 ni parametros legales por este plan sin contrastar fuente oficial y pruebas.
- No tratar ATS como reporte de nomina productivo hasta confirmar alcance funcional y fuente normativa; si el sitio lo ofrece, debe existir evidencia real.
- La promesa comercial de reportes queda supersedida por RPE26: RDEP y Formulario 107 son reportes SRI; IESS se comunica como prevalidacion hasta formato oficial validado.
- Formulario 107 debe generarse como PDF individual anual por trabajador y debe ser consistente con los datos RDEP del mismo periodo.
- RDEP y SAE IESS deben bloquear generacion productiva si falta ficha tecnica vigente, catalogo, estructura o validador aplicable.
- Todo bloqueo legal, tributario, tenant, seguridad, PWA o app movil debe quedar visible para el usuario operativo cuando afecte decisiones.
- Cada fase runtime debe cerrar con pruebas, reporte y `AuditLock.json` firmado.

## Fases

| Fase | Prioridad | Estado | Objetivo |
|------|-----------|--------|----------|
| DPS26-00 | P0 | completed_documental | Crear plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| DPS26-01 | P0 | pending_approval | Contrastar README, landing, PWA, app y backend contra el repo real. |
| DPS26-02 | P0 | pending_approval | Cerrar matriz laboral Ecuador 2026: contratos, jornada, decimos, vacaciones, fondos, IESS y finiquito. |
| DPS26-03 | P0 | pending_approval | Endurecer motor de nomina: reglas puras, snapshots, redondeo, cierre, reversos y auditoria. |
| DPS26-04 | P0 | pending_approval | Cerrar cumplimiento tributario aplicable: IR empleados, reportes SRI aplicables y validadores. |
| DPS26-05 | P0 | pending_approval | Probar inmutabilidad, auditoria, RLS, tenant, cifrado bancario, JWT, S3/logs sin PII. |
| DPS26-06 | P1 | pending_approval | Alinear oferta comercial, landing, planes, PWA y app sin duplicidad ni promesas incompletas. |
| DPS26-07 | P1 | pending_approval | Cerrar flujos PWA criticos con estados comerciales normales y bloqueos visibles. |
| DPS26-08 | P1 | pending_approval | Cerrar app movil: GPS/foto, LOPDP, offline, permisos Android/iOS y readiness stores. |
| DPS26-09 | P0 | pending_approval | Cerrar reportes oficiales/exportables: RDEP, PDF 107, SAE IESS, reportes internos, hash, snapshots y bloqueo por vigencia. |
| DPS26-10 | P0 | pending_approval | Ejecutar QA final, dependencias, observabilidad, docs, AuditLock final y release. |

## Cambios locales previos que DPS26 debe reforzar

Antes de DPS26 existian cambios runtime locales no commiteados. DPS26 los preserva como insumos y exige validacion por fase antes de cierre:

| Grupo local | Archivos visibles | Fase que refuerza | Cierre esperado |
|-------------|-------------------|-------------------|-----------------|
| Fundador/superadmin con tenant operativo | `backend/scripts/seed-superadmin-owner.js`, `backend/src/middleware/auth.js`, `frontend-web/src/utils/access.js`, `frontend-web/src/pages/Dashboard.jsx`, `frontend-web/src/components/Layout/Layout.jsx` | DPS26-05, DPS26-07 | El fundador debe poder operar su tenant sin entrar al codigo, conservando consola superadmin y permisos owner cuando corresponda. |
| Planes y landing sin duplicidad de flujo | `frontend-web/src/components/PublicPlansCatalog.jsx`, `frontend-web/src/config/publicPlanPresentation.js`, `frontend-web/src/pages/Landing.jsx`, `frontend-web/src/pages/Planes.jsx`, `frontend-web/src/pages/PlanesGestion.jsx` | DPS26-06 | Precios visibles en landing, checkout en una fuente de verdad, gestion de planes alimentando la promesa comercial. |
| Login, rutas y resultado de pago | `frontend-web/src/App.jsx`, `frontend-web/src/pages/Login.jsx`, `frontend-web/src/pages/PaymentResult.jsx`, `backend/src/controllers/authController.js` | DPS26-06, DPS26-07 | Navegacion de Planes/Login/Sitio publico correcta, login superadmin sin friccion indebida y pruebas de rutas. |
| Readiness operativo | `backend/src/services/operationalReadinessService.js`, `backend/src/app.routes.test.js`, `backend/src/controllers/authController.test.js` | DPS26-05, DPS26-10 | Mensajes comerciales, responsables correctos y regresiones cubiertas por tests. |

Estos cambios no quedan aprobados automaticamente por DPS26-00. Deben pasar contraste, pruebas y reporte en las fases correspondientes.

## Gates esperados por fase runtime

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=backend test -- --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- `npx.cmd expo-doctor` cuando la fase toque `app-movil`
- Verificacion UTF-8 sin BOM de `.js`, `.md` y `.json` modificados.
- `git diff --check`
- Reporte de fase en `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/`.
- `AuditLock.json` firmado por fase.

## Entregables

- Plan Haiky DPS26.
- Matriz de hallazgos/riesgos y evidencia esperada.
- Contrato de cierre definitivo.
- Runbook QA/release.
- Baseline documental DPS26-00.
- Prompts por fase en `.github/prompts`.
- Contexto operativo consolidado en `.github/CODEX_CONTEXT.md`.
- `AuditLock.json` actualizado para DPS26-00.

## Riesgos residuales controlados

- La verificacion laboral y tributaria requiere fuente oficial vigente y revision profesional antes de declarar cumplimiento productivo.
- La app movil con GPS/foto requiere validacion LOPDP y requisitos de tiendas antes de publicar.
- Los reportes oficiales dependen de fichas tecnicas vigentes y validadores externos cuando existan.
- Los cambios runtime previos en el workspace deben preservarse y no mezclarse con el cierre documental sin aprobacion.

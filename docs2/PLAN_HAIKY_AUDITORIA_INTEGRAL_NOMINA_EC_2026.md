# Plan Haiky - Auditoria integral Nomina EC 2026

Fecha de cierre operativo: 2026-07-12.

## Alcance

Auditoria integral sobre LANDING, PWA, BACKEND y APP-MOVIL de Nomina EC, con foco en funcionalidad real, humanizacion de textos, chunking de informacion, reduccion de ruido/churn, ortografia, UTF-8, duplicacion, codigo muerto, bugs, tablero, homologacion mobile/backend/PWA, facturacion electronica Ecuador, proteccion de datos personales y candidatos de eliminacion justificados.

Alcance juridico y tributario: Ecuador exclusivamente. Colombia y otros paises quedan fuera de alcance para esta auditoria.

## Baseline reconfirmado

- Rama: `main`, con trabajo local sobre cambios de sesion PWA/mobile y artefactos Haiky.
- Regla fuente: `RULES.md`.
- Script diagnostico: `npm.cmd run audit:integral`.
- Script solucion/gate: `npm.cmd run haiky:solution`.
- Validacion ampliada: `npm.cmd run validate` cuando DB/Prisma y entorno local estan disponibles.
- AuditLock: `.vscode/AuditLock.json` y espejo solicitado `.vscode/AudiLock.json`.

## Capacidades confirmadas por codigo

| Area | Estado | Evidencia |
|------|--------|-----------|
| Landing/PWA | Confirmado | `frontend-web/src/pages/Landing.jsx`, `frontend-web/src/pages/Dashboard.jsx`, catalogo publico y pantallas operativas. |
| Backend | Confirmado | Controladores, servicios, Prisma, tests y contratos en `backend/src` y `scripts/verify-system-contracts.mjs`. |
| Mobile | Confirmado | `app-movil/src/App.js`, pantallas de marcacion, autoservicio, permisos, rutas y movilizacion SQLite. |
| Movilizacion | Confirmado | SQLite local, envio backend y aprobacion PWA en `movilizacionController` y `MovilizacionAprobacion.jsx`. |
| Pagos | Confirmado con gate | PayPhone real/sandbox/mock en backend; no concede plan sin confirmacion verificable. |
| Comunicaciones | Confirmado | `communicationService`, auditoria de eventos y UI de comunicaciones. |
| Privacidad | Controles implementados | Consentimiento, exportacion, purga/anonimizacion y pantalla de privacidad. |
| Facturacion electronica | Controlado por integracion | Servicio fiscal/facturador y UI con bloqueo si faltan configuraciones externas. |

## Hallazgos cerrados y reconfirmados

| ID | Severidad | Estado | Hallazgo | Decision |
|----|-----------|--------|----------|----------|
| HAIKY26-SEC-01 | Alta | Cerrado | `catch(() => {})` en limpieza de sesion mobile podia ocultar fallo de borrado local. | Reemplazado por `try/catch` con log estructurado, `code`, `statusCode`, `correlationId`, `userId` y llave afectada. |
| HAIKY26-PRIV-01 | Alta | Cerrado | La persistencia de sesion necesitaba ser opt-in y homologada PWA/mobile. | Cambios existentes de `authStorage`, login PWA/mobile y API mobile se preservan como parte del cierre; no se revierte trabajo del usuario. |
| HAIKY26-UTF8-01 | Alta | Cerrado | Riesgo de mojibake visible en runtime y prompts historicos. | Runtime limpio; los patrones intencionales quedan limitados a centinelas de auditoria. |
| HAIKY26-LEGAL-01 | Alta | Reconfirmado | SBU Ecuador 2026 debe quedar en USD 482. | Usuario valida 482 en pagina del Ministerio del Trabajo; no se cambia parametro. |
| HAIKY26-FISCAL-01 | Media | Controlado | Facturacion electronica depende de firma, autorizacion SRI/facturador y ambiente. | Mantener emision fail-closed cuando falte configuracion oficial externa. |
| HAIKY26-LOPDP-01 | Media | Controlado | GPS, foto, soportes medicos y datos laborales requieren finalidad, retencion y minimo acceso. | Controles existen; requiere revision juridica final antes de despliegue comercial amplio. |
| HAIKY26-MOCK-01 | Media | Controlado | Senales `mock` en PayPhone, storage o resultado de pago pueden parecer funcionalidad ficticia. | No son bugs si estan gateadas; se documentan como senales controladas para evitar falsos positivos. |

## Vigencia legal Ecuador 2026

- Laboral: SBU 2026 USD 482 queda validado operativamente por el usuario contra pagina del Ministerio del Trabajo. Evidencia institucional relacionada: portal MDT y servicio oficial de salarios `https://salarios.trabajo.gob.ec/`.
- Facturacion electronica: fuente oficial SRI `https://www.sri.gob.ec/facturacion-electronica`; el producto debe mantener firma electronica, autorizacion, ambiente de prueba/produccion y validacion de comprobantes fuera del mock.
- Proteccion de datos personales: controles tecnicos implementados en consentimiento, exportacion, purga, privacidad y avisos mobile; no sustituye dictamen juridico ni contratos con encargados.

## Candidatos a eliminacion justificados

| Candidato | Decision 2026-07-12 | Justificacion |
|-----------|---------------------|---------------|
| Modo mock PayPhone | No eliminar ahora | Sirve a desarrollo/test; eliminarlo sin fixture alternativa rompe QA. Debe quedar bloqueado fuera de produccion real. |
| Placeholder S3/R2 | No eliminar ahora | Produccion inicial puede usar storage local controlado; S3/R2 queda opcion futura. Eliminarlo cerraria un camino soportado. |
| Prompts historicos | No eliminar ahora | Son trazabilidad de auditorias previas. Depurar solo con politica de archivo y sin romper CODEX_CONTEXT. |
| Documentos con patrones centinela | No eliminar ahora | Algunos archivos contienen mojibake intencional para pruebas de escaneo; se excluyen de runtime. |
| Duplicacion UI futura | Vigilar | Candidatos deben demostrar ausencia de imports/rutas/tests antes de remover componentes o textos. |

## Fases ejecutables

| Fase | Prompt | Objetivo | Gate |
|------|--------|----------|------|
| 00 | `HAIKY-AUDITORIA-INTEGRAL-2026-00-baseline.md` | Congelar baseline, reglas, estado git y diagnostico. | `npm.cmd run audit:integral`. |
| 01 | `HAIKY-AUDITORIA-INTEGRAL-2026-01-zero-silent-failures.md` | Cerrar errores silenciosos y logs estructurados. | `npm.cmd run haiky:solution`. |
| 02 | `HAIKY-AUDITORIA-INTEGRAL-2026-02-movilizacion-sqlite-cierre.md` | Homologar session, mobile, PWA, backend, tablero y movilizacion sin regresion. | `npm.cmd run check:mobile` y build web. |
| 03 | `HAIKY-AUDITORIA-INTEGRAL-2026-03-lopdp-legal-pagos-email.md` | Reconfirmar LOPDP, facturacion, PayPhone, email y SBU 482. | Informe legal/tecnico actualizado. |
| 04 | `HAIKY-AUDITORIA-INTEGRAL-2026-04-reportes-uiux-humanizacion.md` | Humanizar textos, chunking, ortografia, reportes y rutas. | Build web y gate UTF-8. |
| 05 | `HAIKY-AUDITORIA-INTEGRAL-2026-05-qa-release.md` | QA final, AuditLock, commit y push. | `npm.cmd run validate`, `git diff --check`, push. |

## Scripts JS de solucion

- `scripts/haiky-integral-diagnostic.mjs`: genera diagnostico JSON/Markdown, clasifica senales controladas, vigencia legal y hallazgos no controlados.
- `scripts/haiky-integral-solution.mjs`: ejecuta diagnostico, contratos, mobile readiness, anti silent failures, UTF-8 y firma `AuditLock.json`/`AudiLock.json`.

## Regla anti regresion

No se despliega ni se reporta como cerrado un cambio que no pase los gates locales. Si un hallazgo depende de SRI, MDT, facturador, PayPhone, SMTP, store mobile o revision juridica, se etiqueta como riesgo/control externo y no como falso incumplimiento automatico.

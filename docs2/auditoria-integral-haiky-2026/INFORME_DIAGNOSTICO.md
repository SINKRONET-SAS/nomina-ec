# Informe de diagnostico - Auditoria integral Haiky 2026

Fecha: 2026-07-12.

## Resultado ejecutivo

La auditoria local de LANDING, PWA, BACKEND y APP-MOVIL confirma que el producto tiene funcionalidad real para nomina Ecuador, autoservicio, permisos, rutas, movilizacion SQLite, reportes, pagos, comunicaciones, privacidad y administracion. La brecha principal no es ausencia de modulo, sino gobierno de cierre: evitar errores silenciosos, clasificar falsos positivos, documentar dependencias externas y sostener gates anti regresion.

El SBU Ecuador 2026 queda reconfirmado en USD 482 por validacion del usuario en la pagina del Ministerio del Trabajo. No se modifica el parametro legal.

Alcance juridico: Ecuador exclusivamente. Colombia y otros paises quedan fuera del diagnostico, fuentes, parametros y recomendaciones de esta fase.

## Evidencia automatizada

- `npm.cmd run audit:integral` genera `DIAGNOSTICO_JSON.json` y `DIAGNOSTICO_AUTOMATIZADO.md`.
- `scripts/haiky-integral-diagnostic.mjs` revisa runtime, documentos de fase, UTF-8, deuda marcada, catch silencioso, senales mock/controladas y estado legal 2026.
- `scripts/haiky-integral-solution.mjs` ejecuta diagnostico, contratos, mobile readiness, gate anti silent failures y gate UTF-8.
- `AuditLock.json`, `.vscode/AuditLock.json` y `.vscode/AudiLock.json` quedan como evidencia firmada por SHA-256.

## Hallazgos cerrados

| ID | Severidad | Estado | Evidencia | Resultado |
|----|-----------|--------|-----------|-----------|
| HAIKY26-SEC-01 | Alta | Cerrado | `app-movil/src/App.js` | La limpieza de sesion tras error de almacenamiento ya no usa `catch(() => {})`; registra fallo estructurado con codigo, estado y correlacion. |
| HAIKY26-PRIV-01 | Alta | Cerrado | `frontend-web/src/services/authStorage.js`, login PWA/mobile y API mobile | La persistencia de sesion queda opt-in y homologada entre PWA/mobile; se preservan cambios locales existentes. |
| HAIKY26-UTF8-01 | Alta | Cerrado | Gate UTF-8 runtime | No hay mojibake runtime; los patrones intencionales quedan en centinelas de auditoria. |
| HAIKY26-GOV-01 | Media | Cerrado | `docs2`, `.github/prompts`, `CODEX_CONTEXT.md`, AuditLock | Plan Haiky actualizado con fases, gates, candidatos a eliminacion y controles de regresion. |

## Senales controladas, no falsos positivos

| Senal | Estado | Motivo |
|-------|--------|--------|
| PayPhone mock/dev | Controlado | Sirve para QA y desarrollo; no debe conceder plan productivo sin webhook/confirmacion firmada. |
| Placeholder S3/R2 | Controlado | Storage local productivo inicial esta documentado; S3/R2 queda opcion futura con credenciales reales. |
| Resultado de pago pendiente | Controlado | La PWA muestra pendiente de confirmacion; no equivale a pago exitoso ni activa suscripcion. |
| Prompts/documentos historicos | Controlado | Son trazabilidad; no deben confundirse con runtime ni eliminarse sin politica documental. |

## Legal Ecuador 2026

### Laboral

- SBU 2026: USD 482, validado operativamente por el usuario contra pagina del Ministerio del Trabajo.
- Fuente institucional relacionada: portal del Ministerio del Trabajo y servicio oficial de salarios `https://salarios.trabajo.gob.ec/`.
- Control: no cambiar parametros legales sin fuente oficial vigente, prueba y reporte de impacto.

### Facturacion electronica

- Fuente oficial SRI: `https://www.sri.gob.ec/facturacion-electronica`.
- Requisitos operativos: firma electronica, ambiente de pruebas/produccion, autorizacion/validacion SRI y facturador externo o integracion configurada.
- Estado en producto: controles fail-closed en servicio fiscal y UI de facturacion; no se debe emitir comprobante productivo si falta configuracion oficial.

### Proteccion de datos personales

- Controles presentes: consentimiento, preferencias, exportacion, purga/anonimizacion, privacidad de cuenta, avisos de GPS/foto y auditoria.
- Riesgo residual: requiere revision juridica final de finalidades, retencion, encargados, transferencias y contratos antes de despliegue comercial amplio.
- Decision: no reportar incumplimiento definitivo sin dictamen juridico; si reportar controles obligatorios como pendientes externos.

## Duplicado, codigo muerto y eliminacion

No se ejecutan eliminaciones automaticas en esta fase. Para remover codigo se exige:

- `rg` sin imports/rutas/tests activos.
- Evidencia de reemplazo o fixture si era soporte de QA.
- Gate verde de backend, PWA y mobile.
- Registro en AuditLock y commit con `phase:`/`task:`.

Candidatos vigilados: modo mock PayPhone, placeholder S3/R2, prompts historicos y bloques UI extensos que ya tengan componente compartido equivalente.

## Humanizacion, chunking y ortografia

El cierre mantiene el criterio de UI operativa: menos texto largo, instrucciones accionables, estados vacios claros, terminos visibles en espanol normal y sin jerga interna (`owner`, `mock`, `dev_logged`) para usuarios finales. Las mejoras editoriales deben evitar cambios de contrato API o reglas legales.

## Gates ejecutados de cierre

- `npm.cmd run audit:integral`: PASS, sin hallazgos automatizados no controlados.
- `npm.cmd run haiky:solution`: PASS, AuditLock firmado.
- `npm.cmd run validate`: PASS, contratos, Prisma, backend 52 suites/296 tests y build PWA.
- `git diff --check`: PASS, solo avisos LF/CRLF esperados en Windows.
- Revision de diff antes de commit/push.

## Fuentes

- Ministerio del Trabajo: `https://www.trabajo.gob.ec/` y servicio Salarios `https://salarios.trabajo.gob.ec/`.
- SRI Facturacion Electronica: `https://www.sri.gob.ec/facturacion-electronica`.

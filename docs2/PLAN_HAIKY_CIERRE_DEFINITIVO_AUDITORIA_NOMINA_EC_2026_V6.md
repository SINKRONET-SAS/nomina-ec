# HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V6

Codigo: `CDANV6`
Fecha: 2026-06-28
Estado: `CDANV6-00 documental creado; runtime pendiente de aprobacion por fase`

## Fuentes

- Auditoria: `C:\Users\proam\Downloads\files (5)\informe_auditoria_nomina_ec.md`
- Fix 1: `C:\Users\proam\Downloads\files (5)\fix_1_user_messages_friendly.js`
- Fix 2: `C:\Users\proam\Downloads\files (5)\fix_2_rdep_xsd_verification.js`
- Fix 3: `C:\Users\proam\Downloads\files (5)\fix_3_ortografia_ui.sh`
- Fix 4: `C:\Users\proam\Downloads\files (5)\fix_4_console_log_cleanup.js`
- Fix 5: `C:\Users\proam\Downloads\files (5)\fix_5_parametrizacion_split_plan.js`
- Fix 6: `C:\Users\proam\Downloads\files (5)\fix_6_pwa_maskable_icons.js`
- Fix 7: `C:\Users\proam\Downloads\files (5)\fix_7_lopdp_gps_notice_mobile.js`
- Fix 8: `C:\Users\proam\Downloads\files (5)\fix_8_sueldo_diario_31days.js`
- Fix 9: `C:\Users\proam\Downloads\files (5)\fix_9_gitignore_docs2.sh`
- Reglas: `RULES.md`
- Contexto operativo: `.github/CODEX_CONTEXT.md`
- AuditLock: `.vscode/AuditLock.json`

## Objetivo

Cerrar definitivamente los 9 hallazgos de la auditoria integral Nomina-Ec V6 sin aplicar scripts literalmente ni introducir regresiones en backend, PWA o app movil. Cada fix debe contrastarse contra el repo real, exponerse en frontend o app cuando afecte operacion o UX, probarse y cerrar con `AuditLock.json` firmado.

## Alcance activo

| ID | Prioridad | Area | Cierre esperado |
|----|-----------|------|-----------------|
| HAL-1 | P0 | Mensajes | `user-message-catalog.json` sin mensajes friendly vacios y con texto comercial normal para RRHH. |
| HAL-2 | P0 | RDEP | XSD RDEP reconciliado contra fuente oficial SRI vigente antes de XML productivo. |
| HAL-3 | P1 | UI | Textos visibles con ortografia comercial en PWA y README, sin romper rutas ni claves tecnicas. |
| HAL-4 | P1 | Observabilidad | `console.log` no operativo removido del navegador y logs backend normalizados donde aplique. |
| HAL-5 | P2 | Mantenibilidad | `Parametrizacion.jsx` dividido en helpers/componentes sin cambio funcional. |
| HAL-6 | P1 | PWA | Iconos maskable PNG 192/512 presentes, referenciados y verificables en manifest. |
| HAL-7 | P0 | LOPDP movil | Aviso previo de geolocalizacion antes de solicitar permiso GPS en marcacion. |
| HAL-8 | P0 | Legal laboral | Sueldo pendiente en salida dia 31 no supera 30 dias de divisor mensual. |
| HAL-9 | P2 | Gobierno repo | Politica decidida para `docs2/` y `AuditLock.json` en repo publico sin borrar evidencia activa sin aprobacion. |

## Decisiones obligatorias

- No iniciar runtime sin aprobacion explicita por fase.
- No aplicar los archivos `fix_*` literalmente: son insumos de auditoria y deben adaptarse al estado actual del repo.
- No cambiar SBU 2026 operativo por esta auditoria; el resumen confirma SBU USD 482 como correcto.
- No prometer XML RDEP productivo hasta reconciliar XSD, catalogo y ficha tecnica oficial del SRI.
- No usar mensajes tecnicos en UI cuando exista una alternativa comercial normal.
- HAL-9 no autoriza eliminar `docs2/` ni `.vscode/AuditLock.json` por si solo; requiere decision de gobierno porque estos artefactos son usados por planes Haiky activos.

## Fases

| Fase | Prioridad | Estado | Objetivo |
|------|-----------|--------|----------|
| CDANV6-00 | P0 | completed_documental | Crear plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| CDANV6-01 | P0 | pending_approval | Baseline runtime y contraste de los 9 hallazgos contra repo actual. |
| CDANV6-02 | P0 | pending_approval | Humanizar catalogo de mensajes y verificar consumidores web/mobile/backend. |
| CDANV6-03 | P0 | pending_approval | Reconciliar RDEP XSD, catalogos, manifiesto SHA-256 y gate productivo. |
| CDANV6-04 | P1 | pending_approval | Corregir ortografia UI y limpiar mensajes tecnicos visibles. |
| CDANV6-05 | P1 | pending_approval | Limpiar `console.log` no operativo y adoptar logger estructurado donde aplique. |
| CDANV6-06 | P2 | pending_approval | Dividir `Parametrizacion.jsx` en componentes/helpers con build verde. |
| CDANV6-07 | P1 | pending_approval | Agregar iconos maskable PNG y validar manifest PWA. |
| CDANV6-08 | P0 | pending_approval | Agregar aviso LOPDP GPS movil y corregir sueldo diario dia 31. |
| CDANV6-09 | P0 | pending_approval | Resolver politica docs2/AuditLock, QA final, reporte, commit y push. |

## Gates esperados por cierre runtime

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=backend test -- --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- Verificacion UTF-8 sin BOM de `.js`, `.md`, `.json` modificados.
- `git diff --check`
- `AuditLock.json` firmado por fase.

## Entregables

- Plan: `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026_V6.md`
- Matriz: `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/MATRIZ_CDANV6_HALLAZGOS.md`
- Contrato: `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/CONTRATO_CDANV6_CIERRE_DEFINITIVO.md`
- Runbook: `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/RUNBOOK_CDANV6_QA_RELEASE.md`
- Baseline: `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/REPORTE_CDANV6_00_BASELINE.md`
- Prompts: `.github/prompts/CDANV6-{00..09}-*.md`

## Riesgos residuales controlados

- RDEP depende de fuente externa SRI y revision tributaria profesional antes de habilitar generacion productiva.
- LOPDP GPS requiere validacion legal del texto final y del flujo de consentimiento del empleador.
- La politica de exposicion de `docs2/` debe coordinarse con el modelo operativo de planes Haiky para no perder trazabilidad.

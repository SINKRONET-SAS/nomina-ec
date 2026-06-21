# Plan Haiky - HAIKY-DIAGNOSTICO-V3-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-V3-NOMINA-EC-2026 |
| Codigo | DV3N26 |
| Estado | DV3N26-00 documental generado; runtime pendiente de aprobacion por fase |
| Fase actual | DV3N26-01 pendiente de aprobacion explicita |
| Alcance | cierre definitivo de hallazgos Diagnostico V3 sobre nomina, liquidacion, bancos, reportes, PWA/offline, LOPDP, cifrado bancario, contabilidad, SUT/MDT y QA |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Fuente diagnostico | `C:\proyectos web\sensible-easy-payroll-flow\src\docs\DIAGNOSTICO_V3_NOMINA_EC.md` |
| Scripts referencia | `C:\proyectos web\sensible-easy-payroll-flow\src\docs\scripts\12_fixes_v3.js` |
| Matriz | `docs2/diagnostico-v3-nomina-ec-2026/MATRIZ_DV3N26_HALLAZGOS.md` |
| Runbook | `docs2/diagnostico-v3-nomina-ec-2026/RUNBOOK_DV3N26_QA_CIERRE.md` |
| Reporte baseline | `docs2/diagnostico-v3-nomina-ec-2026/REPORTE_DV3N26_00_BASELINE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-V3-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

DV3N26 convierte el Diagnostico V3 en una linea Haiky ejecutable para cerrar de forma definitiva los hallazgos pendientes y verificar los fixes declarados por el prototipo Base44. El plan no aplica `12_fixes_v3.js` de forma literal: cada fase debe contrastar el stack real de Nomina-Ec, implementar sobre Express/PostgreSQL/Prisma/React/Vite/Expo, exponer impacto en PWA/app cuando corresponda, probar y firmar AuditLock.

## Contexto clave

El diagnostico V3 declara 9 bugs funcionales corregidos, 7 importaciones muertas eliminadas, 3 items legales tratados y 3 modulos nuevos. En el repo operativo esos cambios deben verificarse porque la fuente viene de un prototipo Base44/Deno con nombres como `functions/*` y `pages/*`. Nomina-Ec usa backend Express, PostgreSQL con Prisma para migraciones, PWA React+Vite y app movil Expo.

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| DV3N26-00 | P0 | completed_documental | Baseline documental, matriz, prompts, contexto y AuditLock sin tocar runtime. |
| DV3N26-01 | P0 | pending_approval | Bancos y cierre de nomina: confirmar que archivos bancarios solo usan nominas cerradas/pagadas y que recalculo no altera pagadas. |
| DV3N26-02 | P0 | pending_approval | Legal laboral: Art. 69 vacaciones, Art. 196 fondo de reserva en rol PDF, reportes y provisiones con pruebas. |
| DV3N26-03 | P1 | pending_approval | Reporteria y modulos: rol consolidado PDF, contabilidad/asientos NIC, export CSV/XLSX y navegacion visible. |
| DV3N26-04 | P0 | pending_approval | LOPDP: privacidad/terminos/banner/consentimiento, minimizacion, evidencia visible y bloqueo profesional si falta politica. |
| DV3N26-05 | P0 | pending_approval | Cifrado AES-256-GCM de cuentas bancarias, rotacion/rollback, migracion segura y cero exposicion en logs/UI. |
| DV3N26-06 | P1 | pending_approval | PWA offline: manifest/lang/service worker con estrategia segura para assets y NetworkOnly/API fail-closed. |
| DV3N26-07 | P1 | pending_approval | Integraciones Ecuador: SUT/MDT como flujo controlado, enlaces/estado de registro y bloqueo hasta credenciales/API oficiales. |
| DV3N26-08 | P0 | pending_approval | Limpieza, QA integral, AuditLock, reporte de cierre, commit y push. |

## Reglas DV3N26

- No iniciar una fase funcional sin aprobacion explicita del prompt correspondiente.
- Antes de tocar runtime en cada fase: leer `RULES.md`, `CODEX_CONTEXT.md`, `.vscode/AuditLock.json`, matriz DV3N26 y estado git.
- Los scripts V3 son referencia documental; no se copian literalmente porque provienen de Base44/Deno.
- Todo hallazgo declarado como corregido debe verificarse contra codigo real y tener prueba o evidencia.
- No generar archivos bancarios con nominas en borrador, cuentas sin validar o datos bancarios sin cifrado cuando el flujo sea productivo.
- Art. 69 CT y Art. 196 CT deben quedar parametrizados/probados; si falta fuente vigente, se bloquea profesionalmente.
- LOPDP aplica a cedula, salario, cuenta bancaria, geolocalizacion, documentos, biometria/foto y auditoria.
- APIs offline de PWA no deben devolver datos obsoletos de nomina como si fueran actuales; usar errores claros con `correlationId` cuando aplique.
- SUT/MDT no se simula como integrado: si no hay contrato/API/credenciales, mostrar estado manual y siguiente accion.
- Commits esperados: `phase: DV3N26-XX task: ...`.

## Entregables esperados

- Evidencia de archivo bancario filtrando solo `cerrada`/`pagada` y bloqueo de recalculo de pagadas.
- Liquidacion con vacaciones adicionales por anos posteriores al quinto, cubierta por tests.
- Fondo de reserva visible en rol individual PDF, rol consolidado y reportes/provisiones.
- Selectores de anos dinamicos hasta anio actual + 2 donde aplique.
- Modulo contable visible con asientos de devengamiento/pago, cuadre debe/haber y exportacion.
- Politicas LOPDP publicas, banner/consentimiento versionado y registro auditable.
- Cifrado bancario real con AES-256-GCM o mecanismo equivalente autenticado, sin secretos en repo.
- PWA con manifest/lang/offline verificado y API sin cache peligrosa.
- Flujo SUT/MDT documentado/visible con bloqueo por credenciales o enlace oficial.

## Gates globales

- `npx.cmd prisma validate` en `backend`.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` y `npm.cmd run smoke:pwa` en `frontend-web`.
- `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil` si se toca mobile.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.md`, `.json` modificados.
- Revision manual de rutas/navegacion afectadas.
- AuditLock firmado por fase.

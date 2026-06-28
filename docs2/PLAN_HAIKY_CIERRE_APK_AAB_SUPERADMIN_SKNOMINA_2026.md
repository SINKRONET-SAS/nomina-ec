# HAIKY-CIERRE-APK-AAB-SUPERADMIN-SKNOMINA-2026

Codigo: `APK26`
Fecha: 2026-06-28
Estado: `APK26-01..09 ejecutadas localmente; QA verde`

## Fuentes

- Auditoria: `C:\Users\proam\Downloads\files (7)\informe_auditoria_nomina_ec_v3.md`
- Checklist: `C:\Users\proam\Downloads\files (7)\aab_apk_checklist_nomina.js`
- Fixes fuente: `C:\Users\proam\Downloads\files (7)\fix_1_*.js` a `fix_9_*.js`
- Reglas: `RULES.md`
- Contexto operativo: `.github/CODEX_CONTEXT.md`
- AuditLock: `.vscode/AuditLock.json`

## Objetivo

Cerrar los hallazgos de publicacion mobile, consola fundador, metadatos de tienda, ortografia visible,
roles mobile, estado legal, politica `docs2` y mantenibilidad de parametrizacion sin aplicar los scripts
descargados literalmente ni introducir regresiones.

## Decisiones de baseline

- Google Play exige API level 35 o superior para nuevas apps y actualizaciones desde 2025-08-31.
- Expo SDK 54 declara `targetSdkVersion` 36; por tanto el hallazgo de target 34 queda corregido como
  falso positivo tecnico de la auditoria. No se fuerza upgrade a SDK 56 dentro de este cierre.
- SKNOMINA mantiene SDK 54 mientras los gates de tienda y Expo sean verdes; el upgrade a SDK 56 queda
  como mejora separada, no como bloqueo Play Store.
- `docs2/` y `.vscode/AuditLock.json` siguen siendo trazabilidad activa Haiky; no se eliminan sin
  aprobacion de gobierno. Se ignoran anexos locales, privados y binarios sensibles.
- `sourceStatus` operativo no cambia a un estado parcial porque el guard productivo exige
  `validado_oficial`. Se agregan metadatos de validacion sin romper el contrato.

## Alcance activo

| ID | Prioridad | Area | Cierre esperado |
|----|-----------|------|-----------------|
| HAL-1 | P0 | Mobile Play | Verificar target Play Store contra fuente oficial y dejar gate/documentacion sin upgrade riesgoso. |
| HAL-2 | P0 | Superadmin | `Superadmin.jsx` debe exponer consola fundador propia: vision general, empresas, planes e incidencias. |
| HAL-3 | P0 | Store listing | `app-movil/app.json` con `description` comercial. |
| HAL-4 | P0 | Privacidad | `app-movil/app.json` con `extra.androidPrivacyPolicyUrl`, porque Expo rechaza `android.privacyPolicyUrl`. |
| HAL-5 | P1 | UI | Textos visibles con ortografia comercial normal. |
| HAL-6 | P1 | Mobile roles | App movil diferencia empleado, owner/admin RRHH y roles no operativos. |
| HAL-7 | P1 | Legal | Parametros confirmados con metadatos de validacion, manteniendo guard productivo. |
| HAL-8 | P2 | Repo publico | Politica de `docs2` sin borrar evidencia activa y sin subir anexos privados. |
| HAL-9 | P2 | Parametrizacion | Split ya iniciado; dejar evidencia y evitar refactor de alto riesgo en cierre de Play. |
| HAL-10 | P3 | FCM | No bloqueante mientras no haya push notifications productivas. |

## Fases

| Fase | Prioridad | Estado | Objetivo |
|------|-----------|--------|----------|
| APK26-00 | P0 | completed_documental | Plan, matriz, contrato, runbook, prompts, contexto y AuditLock base. |
| APK26-01 | P0 | completed_local | Diagnostico runtime contra repo actual y fuentes oficiales. |
| APK26-02 | P0 | completed_local | Metadatos Play Store y readiness mobile. |
| APK26-03 | P0 | completed_local | Consola fundador Superadmin separada del panel cliente. |
| APK26-04 | P1 | completed_local | Ortografia y textos comerciales visibles. |
| APK26-05 | P1 | completed_local | Diferenciacion mobile por rol usando `/mobile/me`. |
| APK26-06 | P1 | completed_local | Estado legal y metadatos de validacion. |
| APK26-07 | P2 | completed_local | Politica repo publico y `docs2`/AuditLock. |
| APK26-08 | P2 | completed_local | Parametrizacion y FCM como riesgos controlados. |
| APK26-09 | P0 | completed_local | QA final, reportes, AuditLock, commit y push. |

## Gates esperados

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=backend test -- --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- `npm.cmd --workspace=app-movil run doctor` si el entorno Expo lo permite
- Verificacion UTF-8 sin BOM en `.js`, `.md` y `.json` modificados
- `git diff --check`

## Entregables

- Plan: `docs2/PLAN_HAIKY_CIERRE_APK_AAB_SUPERADMIN_SKNOMINA_2026.md`
- Matriz: `docs2/cierre-apk-aab-superadmin-sknomina-2026/MATRIZ_APK26_HALLAZGOS.md`
- Contrato: `docs2/cierre-apk-aab-superadmin-sknomina-2026/CONTRATO_APK26_CIERRE_PLAY_SUPERADMIN.md`
- Runbook: `docs2/cierre-apk-aab-superadmin-sknomina-2026/RUNBOOK_APK26_QA_RELEASE.md`
- Baseline: `docs2/cierre-apk-aab-superadmin-sknomina-2026/REPORTE_APK26_00_BASELINE.md`
- Prompts: `.github/prompts/APK26-{00..09}-*.md`

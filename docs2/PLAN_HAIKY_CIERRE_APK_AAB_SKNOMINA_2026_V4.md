# HAIKY-CIERRE-APK-AAB-SKNOMINA-2026-V4

Codigo: `APK26V4`
Fecha: 2026-06-29
Estado: ejecutado localmente

## Fuentes

- Auditoria: `C:\Users\proam\Downloads\files (2)\informe_auditoria_nomina_ec_v4.md`
- Checklist: `C:\Users\proam\Downloads\files (2)\apk_aab_checklist_v4.js`
- Fixes: `fix_n1_targetsdkversion_hotfix.js` a `fix_n5_legal_status_validated.js`
- Reglas: `RULES.md`
- Contexto operativo: `.github/CODEX_CONTEXT.md`

## Decision de alcance

- HAL-N1 se cierra con hotfix explicito `android.targetSdkVersion = 35` y validacion en `check-store-readiness.mjs`.
- HAL-N2 se mantiene como deduplicacion cosmetica de mensajes UI; no afecta arquitectura fiscal.
- HAL-N3 no elimina el gobierno Haiky pedido en `docs2/`; retira del tracking los binarios/anexos sensibles ya ignorados por `.gitignore`.
- HAL-N4 esta cerrado previamente: las rutas PWA ya tienen `requiredRole` alineado al backend.
- HAL-N5 pasa a `validado_parcial` conservando pendientes visibles para parametros no confirmados.
- La facturacion fiscal sigue delegada a SINKRONET FACTURADOR; SKNOMINA no implementa XML, XAdES, SRI ni reglas fiscales.

## Fases

| Fase | Objetivo | Resultado |
|------|----------|-----------|
| APK26V4-00 | Baseline | Leer auditoria, fixes y repo real. |
| APK26V4-01 | Play Store | Target SDK 35 explicito y check de readiness. |
| APK26V4-02 | UI y rutas | Deduplicar `extractApiError`; confirmar guards. |
| APK26V4-03 | Gobierno repo publico | Retirar anexos binarios sensibles de `docs2` sin borrar plan Haiky. |
| APK26V4-04 | Legal/facturacion | `sourceStatus=validado_parcial`; timeout facturador visible en readiness. |
| APK26V4-05 | QA release | Gates, AuditLock, commit y push. |

## Gates

- `npm.cmd run check:mobile`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd --workspace=backend test -- paymentController.test.js --runInBand`
- `git diff --check`

## Riesgos residuales

- Probar APK en Android 15 fisico/emulador antes de subir a Play Console por cambios edge-to-edge/keyboard.
- Coordinar `SINKRONET_FACTURADOR_TIMEOUT_MS` con la ventana real de procesamiento del facturador externo.
- Si el repo publico requiere retirar tambien documentacion `.md`, mover primero el gobierno Haiky a un repositorio privado y ajustar el proceso operativo.

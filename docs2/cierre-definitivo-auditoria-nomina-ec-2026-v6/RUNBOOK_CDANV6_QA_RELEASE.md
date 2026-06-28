# RUNBOOK CDANV6 - QA Y RELEASE

## Preparacion

1. Confirmar rama y arbol limpio: `git status --short`.
2. Leer `RULES.md` y `.github/CODEX_CONTEXT.md`.
3. Confirmar aprobacion explicita de la fase runtime.
4. Revisar el fix fuente correspondiente en `C:\Users\proam\Downloads\files (5)`.

## Gates generales

Ejecutar segun el alcance de la fase:

```powershell
npm.cmd run contracts
npm.cmd run prisma:validate
npm.cmd --workspace=backend test -- --runInBand
npm.cmd --workspace=frontend-web run build
npm.cmd run check:mobile
git diff --check
```

## Gates especificos

| Fase | Gate minimo |
|------|-------------|
| CDANV6-02 | Validar JSON de `user-message-catalog.json` y que no existan `friendly` vacios. |
| CDANV6-03 | Validar SHA-256 de XSD actual, manifest y pruebas RDEP; si no hay XSD oficial vigente, dejar bloqueo productivo claro. |
| CDANV6-04 | Build web y revision de strings visibles afectados. |
| CDANV6-05 | `rg "console\\.log" frontend-web/src app-movil/src backend/src` con excepciones documentadas. |
| CDANV6-06 | Build web y smoke manual de Parametrizacion. |
| CDANV6-07 | Verificar existencia de PNG maskable y manifest generado. |
| CDANV6-08 | Test backend liquidacion dia 31 y `check:mobile` para flujo GPS. |
| CDANV6-09 | Decision HAL-9 documentada, diff limpio y AuditLock final. |

## Evidencia por fase

Crear reportes con este patron:

- `REPORTE_CDANV6_01_BASELINE_RUNTIME.md`
- `REPORTE_CDANV6_02_MENSAJES_FRIENDLY.md`
- `REPORTE_CDANV6_03_RDEP_XSD.md`
- `REPORTE_CDANV6_04_UI_ORTOGRAFIA.md`
- `REPORTE_CDANV6_05_LOGS_ESTRUCTURADOS.md`
- `REPORTE_CDANV6_06_PARAMETRIZACION_SPLIT.md`
- `REPORTE_CDANV6_07_PWA_MASKABLE.md`
- `REPORTE_CDANV6_08_LOPDP_GPS_SUELDO_31.md`
- `REPORTE_CDANV6_09_QA_RELEASE.md`

Cada reporte debe incluir alcance, archivos modificados, pruebas, riesgos residuales y decision de release.

## AuditLock

Actualizar `.vscode/AuditLock.json` con:

- `plan`: `HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V6`
- `planCode`: `CDANV6`
- `phaseCompleted`: fase cerrada
- `filesModifiedSummary`
- `validationChecks`
- `previousAuditLockHash`
- `signatureAlgorithm`: `SHA256(previousAuditLockHash + updatedAt)`
- `signature`

## Release

No hacer push si:

- Hay pruebas fallidas no justificadas.
- Hay secrets o datos reales.
- RDEP queda productivo sin XSD reconciliado.
- Mobile solicita GPS sin aviso previo.
- `docs2/` se elimina o ignora sin decision aprobada.

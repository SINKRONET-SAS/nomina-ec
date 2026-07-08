# PLAN HAIKY AUDITORIA INTEGRAL V66 NOMINA EC 2026

Fecha: 2026-07-07  
Repositorio: SINKRONET-SAS/nomina-ec  
Fuente: `AuditoriaIntegral2026V66.jsx` y `v66data.jsx` en `sinkroniq-cloud-flow`.

## Reconfirmacion de hallazgos

| ID | Estado | Resultado |
| --- | --- | --- |
| V66-01 | Confirmado con matiz | `nomina-ec` ya tenia `sendRolPagoDisponible()` para aviso no bloqueante, pero no tenia envio dedicado del rol PDF adjunto al empleado ni endpoint PWA para esa accion. |
| V66-02 | Confirmado | `PermisosScreen` mostraba un placeholder de soporte medico; backend no subia adjunto ni dejaba metadata documental visible para aprobacion. |

## Fases

| Fase | Prioridad | Objetivo | Estado |
| --- | --- | --- | --- |
| V66-00 | P0 | Baseline, plan, prompts y contexto. | completed |
| V66-01 | P0 | Envio de rol de pago PDF por email con SMTP requerido, endpoint protegido, auditoria y accion PWA. | completed |
| V66-02 | P0 | Soporte medico en permisos: selector movil, validacion, storage documental, metadata y revision PWA. | completed |
| V66-03 | P0 | QA, tests, contratos, UTF-8, AuditLock, commit y push. | completed-pass |

## Reglas de ejecucion

- Aplicar `RULES.md` en archivos JS, MD y JSON.
- No reportar falsos positivos: distinguir funcionalidad existente de brecha residual.
- No enviar roles preliminares: el endpoint de email exige `estado = cerrada`.
- No almacenar base64 medico en `novedades_asistencia.metadata`; subir a almacenamiento documental y guardar solo metadata.
- Mantener `sendRolPagoDisponible()` como aviso de cierre no bloqueante.

## Gates previstos

- `npm.cmd --workspace=backend test -- communicationService.test.js nominaController.test.js mobileController.test.js app.routes.test.js --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- `npm.cmd run contracts`
- `git diff --check`
- UTF-8 sin BOM en archivos modificados `.js`, `.jsx`, `.md`, `.json`.

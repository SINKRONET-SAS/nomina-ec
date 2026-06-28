# REPORTE CDANV6-01 - DIAGNOSTICO RUNTIME

## Resultado

Estado: `completed_local`
Fecha: 2026-06-28

Se contrastaron los 9 hallazgos contra el repositorio real antes de aplicar cambios runtime. Los archivos `fix_*` se usaron como insumo de auditoria y no se aplicaron literalmente.

## Hallazgos confirmados

- HAL-1: el catalogo de mensajes no exponia campo `friendly` para los 4 casos auditados.
- HAL-2: existia XSD RDEP y manifiesto, pero el precheck productivo no mostraba ni bloqueaba por reconciliacion oficial.
- HAL-3: persistian textos visibles sin ortografia comercial en PWA/README.
- HAL-4: existian `console.log` no operativos en frontend y logs backend mejorables.
- HAL-5: `Parametrizacion.jsx` contenia helpers y subcomponentes mezclados.
- HAL-6: el manifest PWA no tenia PNG maskable 192/512.
- HAL-7: la app movil solicitaba GPS sin aviso LOPDP previo.
- HAL-8: sueldo pendiente de liquidacion usaba dia 31 sin tope de 30 dias.
- HAL-9: `docs2/` y `.vscode/AuditLock.json` requerian decision de gobierno, no borrado automatico.

## Decision

Se autoriza runtime por solicitud explicita del usuario para CDANV6-01..09. Se conserva SBU 2026 en USD 482.

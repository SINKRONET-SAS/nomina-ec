# HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V5

Codigo: `CDANV5`
Fecha: 2026-06-28
Estado: ejecutado localmente sobre repo real

## Fuentes

- Auditoria: `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V5.jsx`
- Scripts: `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v5_scripts.jsx`
- Hallazgos: `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v5_hallazgos.jsx`
- Reglas: `RULES.md`
- Contexto operativo: `.github/CODEX_CONTEXT.md`

## Correcciones obligatorias V5

- SBU 2026 operativo: USD 482. No aplicar USD 509. LEG-01 verifica que no exista hardcode runtime a USD 470 ni USD 509.
- Viaticos y movilizacion: tratar como ingreso no gravado segun LORTI Art. 9 numeral 11; no usar numeral 3.
- PayPhone: no asumir webhook push con `x-payphone-signature`. La validacion real es activa contra Confirmation API.
- Marca: reemplazar menciones runtime de NOMINA-EC por SKNOMINA. La etiqueta funcional "Mi Nómina" solo se corrige si aparece sin tilde; no se cambia a SKNOMINA.

## Fases

| Fase | Objetivo | Resultado |
|------|----------|-----------|
| CDANV5-00 | Baseline V5 y falsos positivos | Auditoria contrastada contra runtime real. |
| CDANV5-01 | Legal EC y PayPhone | SBU 482 confirmado en runtime, PayPhone por Confirmation API documentado y probado. |
| CDANV5-02 | Reportes anuales | Endpoint y PWA de consolidado anual de nomina. |
| CDANV5-03 | Mobile movilizacion | Sugerencia de ruta desde domicilio/ruta del dia en gastos de movilizacion. |
| CDANV5-04 | Documentacion y prompts | Plan, matriz, runbook, contexto, prompts y AuditLock. |
| CDANV5-05 | QA, commit y push | Gates, commit `phase: CDANV5-05 task: cierre-v5` y push. |

## Entregables runtime

- `GET /api/reportes/nomina/:anio/consolidado` genera Excel anual multi-hoja con filtros y auditoria.
- `DescargarReportes.jsx` expone boton "Consolidado anual".
- `GastosMovilizacionScreen.js` sugiere origen desde domicilio del empleado y destino desde la ruta del dia.
- Pruebas protegen PayPhone Confirmation API y registro del endpoint anual.

## Riesgos residuales

- El valor SBU 482 queda como fuente operativa del repo; cualquier cambio legal posterior debe entrar por parametros versionados y revision laboral/contable.
- Movilizacion avanzada sigue dependiendo de aprobacion PWA, anticipos y reglas contables completas para produccion.
- PayPhone requiere credenciales reales y pruebas de sandbox/productivas antes de cobro real.

# Matriz ANV2 - Hallazgos Auditoria Nomina-Ec 2026 V2

| Codigo | Prioridad | Estado final | Bloque | Hallazgo | Riesgo | Fase | Cierre |
|--------|-----------|----------------|--------|----------|--------|------|-----------------|
| FP-V1-01 | P2 | reconciliado | Documentos | `templateGenerator.js` usa `tenant.razon_social`; no imprime "PLAN HAIKY". | Evitar retrabajo y narrativa incorrecta. | ANV2-01 | Evidencia runtime en `REPORTE_ANV2_01_DIAGNOSTICO_RUNTIME.md`. |
| FP-V1-02 | P2 | reconciliado | Seguridad | `db.query()` revisado usa parametros. | Evitar parche inseguro innecesario. | ANV2-01 | Evidencia runtime con limite de alcance. |
| FP-V1-03 | P2 | reconciliado | Nomina legal | Provision mensual D13 `1/12` es correcta para rol mensual. | Evitar romper calculo mensual correcto. | ANV2-01 | Diferenciado de liquidacion/acumulado legal. |
| FP-V1-04 | P2 | reclasificado | Mobile | `AutoservicioScreen.js` carga rol de pago, pero es incompleto. | Evitar afirmar inexistencia; enfocar alcance. | ANV2-01 | Brecha reclasificada como incompletitud UX/funcional. |
| EMAIL-C01 | P0 | cerrado_local | Comunicaciones | `communicationService.js` no tiene proveedor SMTP/API en `.env.example`. | Emails no llegan: verificacion, recuperacion, invitaciones y churn comercial. | ANV2-02/05 | Proveedor, readiness, modo dev explicito, bloqueo productivo, auditoria y PWA visible. |
| TZ-C01 | P0 | cerrado_local | Timezone | `CerrarMes.jsx` y `DescargarReportes.jsx` usan `new Date()` para defaults. | A las 22h del ultimo dia puede seleccionar mes siguiente fuera de Ecuador. | ANV2-03 | Helper America/Guayaquil, defaults PWA/API y contrato estatico. |
| LEG-H01 | P0 | cerrado_local | Documentos legales | Roles, contratos o plantillas generadas sin seccion de firma del representante legal. | Documentos laborales incompletos para evidencia contractual. | ANV2-04/05 | Firmas y representante/trabajador en roles, contratos y actas; estado visible en PWA. |

## Criterio de clasificacion

- `falso_positivo_corregido`: el diagnostico ANV2-01 debe leer codigo fuente y registrar evidencia; no autoriza cambios runtime.
- `confirmado_fuente`: el plan asume criticidad inicial, pero ANV2-01 debe reconciliar con codigo actual antes de modificar.
- `P0`: bloquea oferta comercial o genera riesgo legal/operativo directo.

## Dependencias

- EMAIL-C01 depende de credenciales/proveedor reales para produccion; sin credenciales, debe quedar bloqueo visible.
- TZ-C01 no depende de servicios externos; debe resolverse con helper, tests y reemplazo de defaults.
- LEG-H01 depende de revision legal ecuatoriana final; el sistema debe generar estructura versionada y auditable.

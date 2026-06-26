# Matriz ANV2 - Hallazgos Auditoria Nomina-Ec 2026 V2

| Codigo | Prioridad | Estado inicial | Bloque | Hallazgo | Riesgo | Fase | Cierre esperado |
|--------|-----------|----------------|--------|----------|--------|------|-----------------|
| FP-V1-01 | P2 | falso_positivo_corregido | Documentos | `templateGenerator.js` usa `tenant.razon_social`; no imprime "PLAN HAIKY". | Evitar retrabajo y narrativa incorrecta. | ANV2-01 | Evidencia de codigo y matriz marcada como falso positivo. |
| FP-V1-02 | P2 | falso_positivo_corregido | Seguridad | `db.query()` revisado usa parametros. | Evitar parche inseguro innecesario. | ANV2-01 | Evidencia de queries parametrizadas y limites de revision. |
| FP-V1-03 | P2 | falso_positivo_corregido | Nomina legal | Provision mensual D13 `1/12` es correcta para rol mensual. | Evitar romper calculo mensual correcto. | ANV2-01 | Distinguir provision mensual de liquidacion/acumulado legal. |
| FP-V1-04 | P2 | falso_positivo_corregido | Mobile | `AutoservicioScreen.js` carga rol de pago, pero es incompleto. | Evitar afirmar inexistencia; enfocar alcance. | ANV2-01 | Brecha reclasificada como incompletitud UX/funcional. |
| EMAIL-C01 | P0 | confirmado_fuente | Comunicaciones | `communicationService.js` no tiene proveedor SMTP/API en `.env.example`. | Emails no llegan: verificacion, recuperacion, invitaciones y churn comercial. | ANV2-02/05 | Proveedor configurado, readiness visible, modo dev bloqueado en produccion, pruebas y auditoria. |
| TZ-C01 | P0 | confirmado_fuente | Timezone | `CerrarMes.jsx` y `DescargarReportes.jsx` usan `new Date()` para defaults. | A las 22h del ultimo dia puede seleccionar mes siguiente fuera de Ecuador. | ANV2-03 | Helper unico America/Guayaquil, paridad web/mobile/API y pruebas borde. |
| LEG-H01 | P0 | confirmado_fuente | Documentos legales | Roles, contratos o plantillas generadas sin seccion de firma del representante legal. | Documentos laborales incompletos para evidencia contractual. | ANV2-04/05 | Bloque de firmas, representante legal, trabajador, version de plantilla y revision legal. |

## Criterio de clasificacion

- `falso_positivo_corregido`: el diagnostico ANV2-01 debe leer codigo fuente y registrar evidencia; no autoriza cambios runtime.
- `confirmado_fuente`: el plan asume criticidad inicial, pero ANV2-01 debe reconciliar con codigo actual antes de modificar.
- `P0`: bloquea oferta comercial o genera riesgo legal/operativo directo.

## Dependencias

- EMAIL-C01 depende de credenciales/proveedor reales para produccion; sin credenciales, debe quedar bloqueo visible.
- TZ-C01 no depende de servicios externos; debe resolverse con helper, tests y reemplazo de defaults.
- LEG-H01 depende de revision legal ecuatoriana final; el sistema debe generar estructura versionada y auditable.

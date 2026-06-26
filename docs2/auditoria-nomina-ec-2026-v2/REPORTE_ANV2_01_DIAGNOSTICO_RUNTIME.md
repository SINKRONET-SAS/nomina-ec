# Reporte ANV2-01 - Diagnostico runtime

## Alcance

Se ejecuto lectura runtime del plan `HAIKY-AUDITORIA-NOMINA-EC-2026-V2` sobre backend, PWA web y app movil. Esta fase no cierra por si sola los hallazgos; clasifica evidencia para ejecutar ANV2-02 a ANV2-06.

## Falsos positivos V1 reconciliados

| Codigo | Estado ANV2 | Evidencia |
|--------|-------------|-----------|
| FP-V1-01 | confirmado como falso positivo | `backend/src/services/templateGenerator.js` arma `company.legalName` desde `tenant.razon_social` o `tenant.razonSocial`; no imprime el nombre interno del plan. |
| FP-V1-02 | confirmado como falso positivo limitado | Las consultas revisadas usan parametros `$1`, `$2`, etc. No se encontro concatenacion directa en los puntos leidos para V2; se mantiene vigilancia en nuevas rutas. |
| FP-V1-03 | confirmado como falso positivo funcional | La provision mensual de decimo tercero `1/12` es consistente para rol mensual. La liquidacion acumulada/legal anual sigue siendo otra salida reportable. |
| FP-V1-04 | reclasificado | `app-movil/src/screens/AutoservicioScreen.js` si carga rol de pago y usa `America/Guayaquil`; la brecha es de completitud UX/reporteria, no inexistencia. |

## Hallazgos ANV2

| Hallazgo | Estado diagnostico | Evidencia | Fase de cierre |
|----------|--------------------|-----------|----------------|
| EMAIL-C01 | vigente parcial | `backend/.env.example` ya contiene SMTP basico, pero `communicationService.js` permite fallback dev implicito fuera de produccion y no expone modo/proveedor/bloqueo productivo suficientemente claro. | ANV2-02 y ANV2-05 |
| TZ-C01 | vigente | `frontend-web/src/pages/Nomina/CerrarMes.jsx`, `DescargarReportes.jsx`, `RolesPagos.jsx` y `Beneficios.jsx` inicializan periodo con `new Date().getFullYear()` y `getMonth() + 1`. | ANV2-03 |
| LEG-H01 | vigente parcial | Contratos y actas ya tienen firmas basicas. `backend/src/services/payrollRolePdfService.js` no tiene bloque de recepcion/firma de representante/delegado y trabajador. Contratos pueden reforzar identificacion de representante legal. | ANV2-04 |

## Riesgo comercial

- Sin proveedor SMTP real y prueba operativa, verificacion, recuperacion e invitaciones pueden aparentar exito en desarrollo sin llegar al usuario.
- Los defaults de periodo deben responder a Ecuador, no al timezone del navegador o servidor.
- Los documentos laborales deben diferenciar evidencia generada por el sistema de registro externo SUT/MDT o revision legal profesional.

## Resultado

ANV2-01 queda completado con evidencia runtime. Se autoriza ejecutar ANV2-02 a ANV2-06 en la misma rama por aprobacion expresa del usuario.

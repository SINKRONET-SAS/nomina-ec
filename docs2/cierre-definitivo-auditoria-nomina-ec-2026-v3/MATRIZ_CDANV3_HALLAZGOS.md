# MATRIZ CDANV3 - HALLAZGOS AUDITORIA NOMINA-EC 2026 V3

## Confirmados criticos y altos

| ID | Prioridad | Area | Estado | Cierre requerido |
|----|-----------|------|--------|------------------|
| HIGH-V3-06 | P0 | Deploy | Confirmado | `render.yaml` debe ejecutar `npm run seed:admins` y declarar `SUPERADMIN_*` sin secretos. |
| CRIT-V3-01 | P0 | Revenue | Confirmado | Webhook Payphone real para activar planes tras pago aprobado y conciliado. |
| HIGH-V3-01 | P0 | Performance/Auth | Confirmado | JWT con `userId`, `tenantId`, `email`, `rol` y compatibilidad con verificacion fresca. |
| CRIT-V3-02 | P0 | Mobile | Confirmado | Instalar/usar SQLite y crear persistencia local de gastos de movilizacion. |
| MOV-V3-01 | P0 | Movilizacion | Confirmado | Flujo completo mobile offline, backend, PWA aprobacion, anticipo y notificacion. |
| CRIT-V3-03 | P0 | Reportes | Verificar | Confirmar que descarga de rol individual usa `payrollReportService` sin 500. |
| HIGH-V3-05 | P1 | Cron | Verificar | Confirmar o definir `calcularNominaTodosTenants()` sin errores silenciosos. |
| DUP-V3-01 | P1 | Periodo | Confirmado | `RolesPagos.jsx` debe iniciar periodo con `America/Guayaquil`. |
| DUP-V3-02 | P1 | Reportes | Confirmado | Centralizar `requirePeriod()` y usar textos comerciales con tildes. |
| HIGH-V3-02 | P1 | Mobile UX | Confirmado | Corregir textos de autoservicio. |
| HIGH-V3-03 | P1 | PWA UX | Confirmado | Corregir `Anio` a `Año` si el archivo usa UTF-8 valido. |
| HIGH-V3-07 | P1 | Mobile UX | Confirmado | Humanizar estado de marcacion fuera de zona/valida. |
| HIGH-V3-08 | P1 | Comunicaciones | Confirmado | Mensaje de email invalido con ortografia comercial. |
| ELIM-V3-01 | P2 | Limpieza | Verificar | Auditar JSON de configuracion sin referencias antes de mover o eliminar. |

## Falsos positivos refutados

| ID | Hallazgo V2 refutado | Decision |
|----|----------------------|----------|
| FP-V3-00 | `superAdminController.js` ausente | Refutado: controlador y servicio existen. No duplicar. |
| FP-V3-01 | `payrollReportService.js` ausente | Refutado: servicio existe. Verificar consumo real. |
| FP-V3-02 | `seed-superadmin-owner.js` ausente | Refutado: script existe. Cerrar pipeline Render. |
| FP-V3-03 | Canal de pago Stripe | Refutado: canal activo es Payphone. Cerrar webhook Payphone. |
| FP-V3-04 | Endpoint Excel de nomina ausente | Pendiente de verificacion de rutas; no crear duplicados sin diagnostico. |

## Criterios de no regresion

- No se elimina superadmin existente ni se recrea con otra API.
- No se cambia Payphone por Stripe.
- No se rompe el flujo de pagos bancarios, roles PDF, reportes de entidades o app movil existente.
- No se cambia el contrato publico de auth sin compatibilidad con tokens vigentes.
- No se guarda ningun gasto de movilizacion sin `tenant_id`, `empleado_id`, periodo y estado.
- No se aprueba movilizacion sin usuario aprobador, fecha, monto y trazabilidad.

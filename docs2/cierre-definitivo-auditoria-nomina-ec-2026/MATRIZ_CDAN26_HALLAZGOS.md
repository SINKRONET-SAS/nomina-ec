# Matriz CDAN26 - Hallazgos Confirmados Auditoria Nomina-EC

Fuente: respuesta del usuario sobre Auditoria Integral Nomina-EC V1 y archivos fuente de auditoria ubicados en `C:\proyectos web\sinkroniq-cloud-flow\src\pages`.

| ID | Prioridad | Estado | Area | Evidencia auditoria | Riesgo | Fase cierre | Criterio de aceptacion |
|----|-----------|--------|------|---------------------|--------|-------------|------------------------|
| SEC-NEC-01 | P0 | cerrado_local | Seguridad | `render.yaml` expone `plan_haiky` / `haiky_migration`. | Exposicion de naming interno, superficie de ataque y mala higiene comercial. | CDAN26-02 | Infraestructura usa naming publico Nomina-Ec o neutral, secretos fuera de repo, rollback documentado y build/deploy sin ruptura. |
| LEG-NEC-02 | P0 | cerrado_local | Legal CT | No existe guard SBU USD 460/2026. | Nominas potencialmente ilegales por salario inferior al minimo vigente. | CDAN26-03 | Calculo bloquea sueldo base inferior a SBU vigente, permite solo excepciones legales auditadas y muestra bloqueo en UI. |
| LEG-NEC-03 | P0 | cerrado_local | Legal SRI | No existe Formulario 107 individual. | Incumplimiento de obligacion anual SRI y falta de evidencia por trabajador. | CDAN26-04 | Cada empleado con relacion laboral aplicable puede generar/descargar Formulario 107 anual PDF versionado y auditado. |
| BUG-NEC-01 | P0 | cerrado_local | Calculo | `calcularMes()` actualiza `payroll_periods` fuera de transaccion. | Doble calculo, estados inconsistentes y cierre parcial. | CDAN26-05 | Calculo, roles, totales y estado de periodo se confirman o revierten juntos; reintento idempotente. |
| MON-NEC-01 | P0 | cerrado_local | Revenue | Botones de pago sin integracion Stripe funcional. | Venta no cobra, suscripcion no se activa o activacion queda manual. | CDAN26-06 | Checkout real o bloqueo visible por falta de credenciales; webhook validado, idempotencia y conciliacion. |
| COM-NEC-01 | P0 | cerrado_local | Email | Falta `sendRolPagoDisponible()`. | Empleados no reciben notificacion cuando el rol queda disponible. | CDAN26-07 | Al publicar rol se envia notificacion real/auditable o queda pendiente con causa visible. |
| LEG-NEC-01 | P0 | cerrado_local | Legal CT | Fondo de Reserva sin modalidad MENSUAL/IESS por empleado. | Pago/provision incorrecta y reclamos laborales. | CDAN26-03 | Ficha empleado define modalidad, calculo la respeta, reportes la muestran y migracion conserva compatibilidad. |
| SADM-NEC-01 | P1 | cerrado_local | SuperAdmin | Sin interfaz web para parametros legales anuales. | Operacion depende de DB/scripts y aumenta riesgo de error legal. | CDAN26-03 | Superadmin gestiona parametros con vigencia, fuente, aprobacion, auditoria y bloqueo de cambios inseguros. |

## No hallazgos protegidos

| Item | Estado | Regla CDAN26 |
|------|--------|--------------|
| `bcryptjs` | correcto | No reemplazar sin analisis de compatibilidad de hashes existentes. |
| `normalizePhone()` Ecuador 593 | correcto | Conservar normalizacion y agregar pruebas si la fase toca telefonos. |
| `Intl.DateTimeFormat` con `America/Guayaquil` | correcto | No cambiar a `new Date()` local para defaults operativos. |
| Parametros legales por tenant/anio | correcto | Reusar modelo existente; no crear tabla paralela sin justificacion. |
| ExcelJS para AEB bancario | correcto | No reemplazar generador bancario fuera de fase aprobada. |

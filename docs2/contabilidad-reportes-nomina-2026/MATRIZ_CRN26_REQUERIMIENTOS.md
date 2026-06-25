# Matriz CRN26 - Contabilidad y reportes de nomina

| ID | Prioridad | Requerimiento | Criterio de aceptacion | Fase |
|----|-----------|---------------|------------------------|------|
| CRN-R01 | P0 | Inventariar conceptos de nomina | Existe catalogo canonico de sueldo, extras, bonos, comisiones, IESS, IR, beneficios, provisiones, fondo de reserva, neto banco y ajustes. | CRN26-02 |
| CRN-R02 | P0 | Esquema contable por parametro | Cada concepto tiene cuenta debe/haber, naturaleza, asiento, vigencia y estado configurable por tenant. | CRN26-03 |
| CRN-R03 | P0 | No cuentas hardcodeadas | Reportes contables consumen mapping vigente; defaults solo sirven como semilla auditable. | CRN26-06 |
| CRN-R04 | P0 | Snapshot de calculo | Cada nomina calculada guarda lineas normalizadas por concepto y fuente sin depender solo de JSON libre. | CRN26-04 |
| CRN-R05 | P0 | Compatibilidad historica | `detalle_calculo` existente sigue disponible y no se rompe API publica ni reportes actuales. | CRN26-04 |
| CRN-R06 | P0 | Reporte por empleado | La PWA permite seleccionar un empleado y exportar el desglose completo de calculo del periodo. | CRN26-05 |
| CRN-R07 | P0 | Reporte todos los empleados | La exportacion tiene filas por empleado y columnas dinamicas por beneficios/conceptos activos en el periodo. | CRN26-05 |
| CRN-R08 | P0 | Columnas de beneficios | Anticipos, prestamos y beneficios aprobados aparecen como columnas separadas y total conciliable. | CRN26-05 |
| CRN-R09 | P0 | Reportes contables de nomina | Se generan asientos de devengamiento, provisiones y pago con debe/haber balanceado. | CRN26-06 |
| CRN-R10 | P0 | Bloqueo por mapeo incompleto | Si falta mapping requerido, el reporte contable falla con mensaje visible y accion sugerida. | CRN26-06 |
| CRN-R11 | P1 | Centros de costo | Reportes agrupan por unidad organizativa, cargo, centro de costo y empleado. | CRN26-06 |
| CRN-R12 | P1 | Exportaciones auditadas | Cada descarga registra usuario, filtros, hash, correlationId, total filas y archivo. | CRN26-06 |
| CRN-R13 | P0 | UI de esquema contable | Owner/RRHH autorizado puede ver y editar mapeos con vigencia, validacion y estado. | CRN26-07 |
| CRN-R14 | P0 | UI de reportes | Pantalla de reportes muestra matriz, detalle empleado y contabilidad con filtros claros. | CRN26-07 |
| CRN-R15 | P0 | AuditLock por fase | Cada fase actualiza `AuditLock.json` con firma, checks y archivos modificados. | CRN26-08 |
| CRN-R16 | P0 | Pruebas y rollback | Migraciones tienen rollback documentado y pruebas cubren balance contable y matriz dinamica. | CRN26-08 |

## Bloqueos de negocio por definir

- Plan de cuentas real por tenant y reglas de homologacion contable.
- Si beneficios por cobrar se separan por empleado, por tipo de beneficio o por cuenta unica.
- Si provisiones se contabilizan mensualmente o solo al cierre anual segun politica del contador.
- Formato importable a ERP externo, si aplica.

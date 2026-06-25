# Contrato CRN26 - Esquema contable y reportes de nomina

## Concepto reportable

Todo concepto de nomina debe tener:

- `code`: codigo canonico estable, por ejemplo `sueldo_base`, `aporte_iess_personal`, `beneficio_prestamo`.
- `label`: nombre visible en PWA y reportes.
- `category`: `ingreso`, `deduccion`, `provision`, `pasivo`, `pago` o `informativo`.
- `sign`: `debit`, `credit` o `info` segun naturaleza base.
- `source`: `nomina`, `novedad`, `beneficio`, `legal_parameter`, `manual_adjustment`.
- `requiredAccounting`: booleano que indica si bloquea reportes contables.
- `effectiveFrom` y `effectiveTo`: vigencia.
- `metadata`: formula, parametro legal, version y observaciones.

## Mapping contable

Cada tenant debe poder configurar:

- `conceptCode`.
- `debitAccountCode` y `debitAccountName`.
- `creditAccountCode` y `creditAccountName`.
- `entryType`: `DEVENGAMIENTO`, `PROVISION`, `PAGO`, `AJUSTE`.
- `costCenterMode`: `employee`, `organization_unit`, `fixed` o `none`.
- `fixedCostCenterCode` cuando aplique.
- `validFrom`, `validTo`, `status`.
- `requiresEmployeeBreakdown`.

Reglas:

- Un concepto requerido no puede generar reporte contable si no tiene mapping activo para el periodo.
- No se puede editar un mapping historico usado por nominas cerradas; se crea nueva vigencia.
- Los defaults del sistema no reemplazan la aprobacion del tenant para uso productivo.

## Linea de calculo

Cada linea normalizada debe incluir:

- `payrollId`, `tenantId`, `employeeId`, `anio`, `mes`.
- `conceptCode`, `label`, `category`, `amount`.
- `source`, `sourceId`, `sourceVersion`.
- `legalParameterKey` si deriva de parametro legal.
- `costCenterCode`, `organizationUnitCode`, `positionCode`.
- `metadata` con detalle minimo para auditoria.

## Reportes requeridos

### Detalle por empleado

Entrada: `employeeId`, `anio`, `mes`, formato.

Salida:

- Datos del empleado y estructura.
- Totales de ingresos, deducciones, provisiones, costo empleador y neto.
- Lineas de calculo con parametro, fuente, formula y monto.
- Beneficios aplicados con saldo/cuota si existe.

### Matriz empleados x beneficios/conceptos

Entrada: `anio`, `mes`, filtros de estructura y formato.

Salida:

- Una fila por empleado.
- Columnas fijas: cedula, empleado, cargo, unidad, centro de costo, estado.
- Columnas dinamicas por concepto/beneficio activo en el periodo.
- Totales conciliables: ingresos, deducciones, provisiones, costo empleador, neto.

### Reporte contable

Entrada: `anio`, `mes`, filtros de estructura, `entryType`.

Salida:

- Una fila por asiento/concepto/empleado o agrupacion.
- Columnas: periodo, asiento, cuenta, nombre cuenta, debe, haber, empleado, centro costo, concepto, referencia.
- Debe y haber balanceados por asiento y por periodo.
- Error explicito si falta mapping o si el balance no cuadra.

## API esperada

- `GET /api/nomina/contabilidad/conceptos`
- `GET /api/nomina/contabilidad/mapeos`
- `POST /api/nomina/contabilidad/mapeos`
- `PUT /api/nomina/contabilidad/mapeos/:id`
- `POST /api/reportes/nomina/exportar` con `reportCode = PAYROLL_EMPLOYEE_DETAIL`
- `POST /api/reportes/nomina/exportar` con `reportCode = PAYROLL_BENEFITS_MATRIX`
- `POST /api/reportes/nomina/exportar` con `reportCode = PAYROLL_ACCOUNTING_REPORT`

Todas las respuestas deben incluir `correlationId` y errores con `code`, `statusCode`, `correlationId` y `userId` cuando exista.

## Implementacion CRN26 local

La ejecucion local conserva un unico endpoint de exportacion para no romper la API existente de reportes y agrega codigos de reporte CRN26. La configuracion contable queda disponible tanto en rutas dedicadas de nomina como en el recurso generico `/api/configuracion/payrollAccountingMappings`, que es el usado por la PWA de parametrizacion.

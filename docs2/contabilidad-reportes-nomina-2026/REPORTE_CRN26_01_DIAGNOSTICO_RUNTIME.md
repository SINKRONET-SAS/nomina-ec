# Reporte CRN26-01 - Diagnostico runtime

## Estado

Completado localmente.

## Hallazgos

- `calculoNominaService` ya guardaba `detalle_calculo` con ingresos, deducciones, provisiones, fondo de reserva y beneficios descontados.
- `beneficioEmpleadoService` ya entregaba anticipos/prestamos aprobados por periodo.
- `payrollReportService` ya exportaba resumen, detalle tabular y asientos legacy, pero las cuentas estaban fijas.
- `configurationService` ya soportaba recursos tenant-aware reutilizables para CRUD y auditoria.
- `Parametrizacion.jsx` ya podia renderizar formularios por definicion, y `DescargarReportes.jsx` ya tenia filtros de nomina.

## Decision

CRN26 se implementa sobre las superficies existentes:

- Nuevo recurso de configuracion `payrollAccountingMappings`.
- Nuevas tablas `payroll_accounting_mappings` y `payroll_calculation_lines`.
- Nuevos reportes sobre `/api/reportes/nomina/exportar`.
- Endpoints dedicados de contabilidad para cubrir contrato sin duplicar logica.

## Evidencia

- Archivos inspeccionados: `backend/src/services/calculoNominaService.js`, `backend/src/services/beneficioEmpleadoService.js`, `backend/src/services/payrollReportService.js`, `backend/src/services/configurationService.js`, `frontend-web/src/pages/Configuracion/Parametrizacion.jsx`, `frontend-web/src/pages/Nomina/DescargarReportes.jsx`.

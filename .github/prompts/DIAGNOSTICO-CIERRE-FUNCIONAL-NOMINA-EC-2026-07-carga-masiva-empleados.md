# DCF26-07 - Carga masiva de empleados

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Implementar carga masiva real de empleados con validaciones, rollback y reporte de errores.

## Alcance

- Descargar plantilla CSV/XLSX DEMO.
- Upload seguro.
- Parseo y validacion por fila: cedula/RUC, contrato, sueldo, banco, estructura, fechas, email.
- Modo preview antes de importar.
- Commit de importacion y rollback por lote.
- Reporte de errores descargable.

## Reglas

- No usar datos reales en plantilla.
- No crear empleados parcialmente sin lote auditable.
- No guardar cuentas bancarias sin cifrado.

## Entregables

- Backend import service.
- UI de carga, preview, errores y rollback.
- Tests unitarios y smoke.
- Reporte `REPORTE_DCF26_07_CARGA_MASIVA_EMPLEADOS.md`.

## Gates

- Import DEMO con filas validas e invalidas.
- Backend tests.
- Frontend build.

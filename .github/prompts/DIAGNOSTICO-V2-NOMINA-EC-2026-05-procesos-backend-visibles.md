# DVN26-05 - Procesos backend visibles

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P1.

## Objetivo

Resolver B-01..B-05: alertas de decimos, marcaciones faltantes, AuditLog, equipos y DocumentoLegal con pantallas operables.

## Reglas

- Ningun proceso backend puede quedar oculto si afecta operacion o bloqueo legal.
- Cada ejecucion manual debe registrar audit log.
- Errores de cron deben ser visibles y reintentables.

## Entregables

- Panel de automatizaciones.
- Pantalla de auditoria filtrable.
- CRUD de equipos/entregas con bloqueo de finiquito explicable.
- Biblioteca DocumentoLegal.
- Reporte `REPORTE_DVN26_05_PROCESOS_VISIBLES.md`.

## Gate

Frontend build, node checks y evidencia de rutas visibles en navegacion.

# DCF26-02 - Operacion integral real

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Reemplazar los catalogos genericos P0 de `OperacionIntegral` por flujos reales o links a modulos reales ya existentes.

## Alcance minimo

- Mapeo contable con servicio y tabla/endpoint tenant-scoped.
- RDEP como panel de precheck real, no JSON libre.
- Carga masiva y apertura de mes como acciones ejecutables o bloqueadas con razon verificable.
- Dashboard metricas como configuracion que alimente una metrica real.

## Reglas

- No crear pantallas paralelas si ya existe modulo.
- Cada tarjeta debe hacer una accion real: crear, validar, ejecutar, importar, descargar o abrir modulo existente.
- Si un proceso no puede ejecutarse por fuente externa, debe mostrar bloqueo verificable y siguiente accion.
- Frontend obligatorio: botones, estados, errores y registros reales.

## Entregables

- UI actualizada en `frontend-web`.
- Endpoints/servicios especializados en `backend` para los modulos P0.
- Tests de backend y al menos smoke manual documentado.
- Reporte `REPORTE_DCF26_02_OPERACION_REAL.md`.

## Gates

- No debe quedar P0 guardando solo `configuration_catalogs.payload`.
- `npm.cmd test -- --runInBand`
- `npm.cmd run build`

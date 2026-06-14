# Contrato ONI26-10 - Apertura de Mes y Novedades

## Alcance

Definir apertura mensual, estados de periodo y carga de novedades por lote segun estructura organizativa.

## Reglas

- Todo periodo inicia en `draft` y solo puede cerrarse desde `approved`.
- Reapertura exige permiso, motivo y auditoria.
- Los lotes de novedades requieren idempotencia.
- La deteccion de duplicados se realiza por empleado, periodo, tipo de novedad y documento fuente.
- El rollback reversa el lote y conserva auditoria.

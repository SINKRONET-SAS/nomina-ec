# DCF26-08 - Apertura de mes y lotes de novedades

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Crear un flujo ejecutable de apertura mensual y carga de novedades por estructura organizativa.

## Alcance

- Periodo mensual con estados: draft, open, novelties_loaded, calculated, approved, closed.
- Lotes de novedades por empresa, departamento, centro de costo o empleado.
- Idempotencia por lote.
- Validacion de tipos de novedad configurados.
- UI de seguimiento y errores.

## Reglas

- No calcular nomina sobre periodo cerrado salvo reapertura auditada.
- No duplicar novedades si se reintenta el lote.
- No permitir lote sin estructura o periodo valido.

## Entregables

- Tablas/servicios si faltan.
- UI de apertura, lote, estado y auditoria.
- Tests de idempotencia y transiciones.
- Reporte `REPORTE_DCF26_08_APERTURA_MES_LOTES.md`.

## Gates

- Backend tests.
- Frontend build.
- Smoke con empresa DEMO.

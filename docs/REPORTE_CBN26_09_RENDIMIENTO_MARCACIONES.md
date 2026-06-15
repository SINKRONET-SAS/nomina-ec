# REPORTE CBN26-09 - Rendimiento de marcaciones

Estado: completed_local
Fecha: 2026-06-14

## Resultado

Se optimizo la consulta de marcaciones de hoy:

- `/api/marcaciones/hoy` usa rango `timestamp >= CURRENT_DATE AND timestamp < CURRENT_DATE + INTERVAL '1 day'`.
- Devuelve `metrics` agregadas: total, empleados marcados, inicios y fines de jornada.
- Limita el detalle a 50 registros por defecto y maximo 200.
- `verificarMarcacionesFaltantes` dejo de usar `DATE(m.timestamp)` para filtrar y usa rango indexable.

## Validacion

- `node --check backend/src/controllers/marcacionController.js` paso.
- `node --check backend/src/config/cron-jobs.js` paso por validacion de sintaxis.
- Frontend build paso.

## Impacto

Dashboard puede leer metricas agregadas sin cargar colecciones grandes para conteos simples.

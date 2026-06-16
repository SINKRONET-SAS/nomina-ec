# DCF26-06 - API v1 de integracion

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Implementar la API externa minima prometida en `/api/v1` con gobierno de seguridad real.

## Alcance

- Versionado `/api/v1`.
- Autenticacion por cliente/API key firmada u OAuth client credentials, segun decision tecnica.
- Scopes, rate limit, idempotencia en escrituras y auditoria.
- Endpoints minimos: empleados read, asistencia write, novedades write, nomina read.
- Documentacion OpenAPI y ejemplos DEMO.

## Reglas

- No exponer datos personales sin scope y tenant isolation.
- No loggear payloads sensibles.
- No activar integraciones externas por defecto.

## Entregables

- Middleware API externo.
- Rutas `/api/v1`.
- Tests de auth/scopes/rate/idempotencia.
- UI OWNER/SUPERADMIN para clientes API o bloqueo visible si queda cerrado.
- Reporte `REPORTE_DCF26_06_API_V1_INTEGRACION.md`.

## Gates

- Backend tests.
- Smoke con cliente DEMO.
- OpenAPI actualizado.

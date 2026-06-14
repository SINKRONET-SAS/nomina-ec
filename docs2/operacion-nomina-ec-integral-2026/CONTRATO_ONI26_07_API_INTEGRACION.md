# Contrato ONI26-07 - API de Integracion

## Alcance

La API publica queda definida como contrato `v1` y permanece cerrada hasta cumplir gates de seguridad, autenticacion, rate limits, auditoria e idempotencia.

## Reglas

- Versionado obligatorio bajo `/api/v1`.
- Toda llamada requiere `X-Correlation-Id`.
- Toda escritura requiere `Idempotency-Key`.
- No se registran payloads completos con datos personales en logs.
- Scopes por modulo y tenant.
- Rate limits por credencial y tenant.

## Entregables

- `backend/src/config/public-api-contract.json`
- `docs2/operacion-nomina-ec-integral-2026/OPENAPI_ONI26_INTEGRACION.yaml`

# MSF26-05 - Contrato API SINKRONET FACTURADOR

Objetivo: implementar cliente y readiness de integracion fiscal sin emitir facturas reales.

Instrucciones:

- Requiere aprobacion explicita.
- Aplicar `RULES.md`.
- Crear cliente HTTP server-to-server con base URL por entorno, secreto por env, timeout, retry, circuito e idempotencia.
- Validar health/readiness del facturador.
- No guardar secretos en repo.
- Si el endpoint requerido no existe en facturador, documentar bloqueo y contrato pendiente.

Salida esperada:

- Cliente facturador con tests mock.
- Estado readiness visible para PWA.
- Reporte `REPORTE_MSF26_05_API_FACTURADOR.md`.
- AuditLock firmado.

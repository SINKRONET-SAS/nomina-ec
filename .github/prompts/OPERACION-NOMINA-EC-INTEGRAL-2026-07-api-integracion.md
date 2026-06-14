# ONI26-07 - API de integracion

Actua bajo `RULES.md`.

Objetivo: definir API para integrar Nomina-Ec con otros sistemas.

Tareas:

- Validar AuditLock ONI26-06.
- Definir versionado, autenticacion, scopes, rate limits e idempotencia.
- Crear contrato OpenAPI o documento equivalente.
- Agregar ejemplos de integracion con datos DEMO.
- Auditar llamadas con correlationId.

Cierre:

- No exponer endpoints inseguros.
- Contrato API versionado.
- AuditLock firmado para ONI26-07.
- Commit esperado: `phase: ONI26-07 task: api integracion`.

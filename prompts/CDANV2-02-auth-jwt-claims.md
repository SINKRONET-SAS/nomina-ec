# CDANV2-02 - Auth JWT con claims

Objetivo: resolver o descartar `SEC-V2-02`.

Implementar solo si el diagnostico confirma query por request no necesaria.

Requisitos:
- JWT con `userId`, `tenantId`, `email`, `rol` y estado minimo requerido.
- Compatibilidad temporal con tokens previos o expiracion controlada.
- Middleware fresh-user para operaciones criticas.
- Errores con codigo, status, correlationId y userId cuando exista.
- Tests unitarios/integracion.
- Frontend sin ruptura de sesion.

# CDANV3-04 - Auth JWT claims

Objetivo: eliminar la consulta DB por request normal autenticado usando claims JWT.

Implementar:
- `signUserToken()` o equivalente con `userId`, `tenantId`, `email`, `rol`.
- Middleware auth que use claims en requests normales.
- `requireFreshUser` para operaciones criticas.
- Compatibilidad con tokens legados o rechazo seguro con mensaje claro.

Validar:
- Tests de auth normal sin query innecesaria.
- Tests de operacion critica con verificacion fresca.
- Expiracion y token invalido con mensajes comerciales.

Cierre:
- Reporte `REPORTE_CDANV3_04_AUTH_JWT_CLAIMS.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-04 task: auth-jwt-claims`.

# Fase 23 - Auth backend, registro y recuperacion

Actua bajo `RULES.md`.

Objetivo: implementar contratos backend seguros para registro publico, login, refresh, logout, verificacion de email y recuperacion de password.

Tareas:

- Validar AuditLock de fase 22.
- Revisar `backend/src/controllers/authController.js`, rutas auth y RBAC actual.
- Definir si `POST /api/auth/register` sigue siendo administrativo y se crea `POST /api/auth/public-register`.
- Crear persistencia para sesiones, refresh tokens, verificacion de email y reset tokens.
- Implementar tokens hasheados, expiracion, rate limit, auditoria y errores en espanol.
- Mantener logs con `correlationId`.

Cierre:

- Tests de register/login/refresh/logout/forgot/reset.
- Tests de abuso/rate limit.
- Migraciones Prisma validadas.
- AuditLock firmado para fase 23.


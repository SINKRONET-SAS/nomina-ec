# HAIKY-AUDITORIA-INTEGRAL-2026-01 - Zero silent failures

Objetivo: eliminar errores silenciosos en runtime.

Reglas: todo fallo debe registrar `code`, `statusCode`, `correlationId` y `userId` si existe.

Tareas:
- Buscar `catch(() => {})` y `catch (err) {}` en `backend/src`, `frontend-web/src`, `app-movil/src` y `scripts`.
- Reemplazar por log estructurado o `AppError`.
- Mantener mensajes visibles en espanol tecnico.

Cierre:
- `npm.cmd run haiky:solution`.
- Gate anti silent failures en verde.


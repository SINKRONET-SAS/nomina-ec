# HAIKY-AUDITORIA-INTEGRAL-2026-01 - Zero silent failures

Objetivo: eliminar errores silenciosos de runtime y mantener logs estructurados.

Reglas:
- Prohibido `catch(() => {})` y `catch (...) {}` en runtime.
- Todo fallo debe registrar o propagar `code`, `statusCode`, `correlationId` y `userId` cuando exista.
- Mensajes visibles y logs operativos en espanol tecnico; sin mojibake.

Tareas:
- Buscar patrones silenciosos en `backend/src`, `frontend-web/src`, `app-movil/src` y `scripts`.
- Reemplazar silencios por `try/catch` explicito, `AppError`, `console.error` estructurado o propagacion controlada.
- Reconfirmar que las limpiezas de sesion PWA/mobile no ocultan errores.

Cierre:
- `npm.cmd run haiky:solution`.
- Gate anti silent failures en verde.
- Hallazgo documentado como cerrado o bloqueado con evidencia.

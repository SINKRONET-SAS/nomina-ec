# HAIKY-AUDITORIA-INTEGRAL-2026-02 - Homologacion mobile, PWA, backend y tablero

Objetivo: validar que MOBILE, PWA y BACKEND hablan el mismo contrato funcional y que movilizacion SQLite no genera cierres locales inconsistentes.

Reglas:
- No cerrar estado local si backend no acepto la operacion cuando el flujo requiere persistencia central.
- No cambiar payloads publicos sin compatibilidad.
- No ocultar acciones por UI como sustituto de RBAC backend.
- Mantener estados offline claros y recuperables en mobile.

Tareas:
- Revisar login/session mobile y PWA, incluyendo persistencia opt-in.
- Revisar rutas, marcaciones, permisos, autoservicio, movilizacion y tablero PWA.
- Confirmar que capacidades comerciales y roles coinciden entre backend, PWA y app movil.
- Identificar duplicacion o codigo muerto solo con evidencia de imports/rutas/tests.

Cierre:
- `npm.cmd run check:mobile`.
- `npm.cmd --workspace=frontend-web run build`.
- Hallazgos de homologacion clasificados como cerrados, controlados o pendientes externos.

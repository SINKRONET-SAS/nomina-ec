# HAIKY V66 01 - Rol de pago por email

Usar `.github/CODEX_CONTEXT.md` y `RULES.md`.

Objetivo: cerrar V66-01 sin romper el aviso existente de cierre mensual.

Tareas:

- Mantener `sendRolPagoDisponible()` como notificacion no bloqueante.
- Agregar envio dedicado de PDF adjunto con SMTP requerido.
- Exigir rol cerrado, tenant correcto, rol owner/admin_rrhh y usuario fresco.
- Exponer accion en PWA Roles de Pago.
- Agregar pruebas de servicio, controlador y ruta.

Gate: tests backend especificos verdes.

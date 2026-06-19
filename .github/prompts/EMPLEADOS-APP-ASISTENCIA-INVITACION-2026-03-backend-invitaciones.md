# EAA26-03 - Backend de invitaciones

Objetivo: implementar endpoints y servicios para crear, reenviar, revocar, aceptar y auditar invitaciones de empleados.

Requisitos:

- Solo OWNER/RRHH autorizado puede emitir invitaciones.
- Aceptacion publica debe ser anti-enumeracion.
- Hash de codigo, expiracion, uso unico y transaccion.
- Validar empleado activo y tenant correcto.
- Registrar consentimiento, version de privacidad y correlation id.
- Errores con `code`, `statusCode`, `correlationId` y mensaje en espanol.

Tests:

- Happy path.
- Codigo vencido.
- Codigo revocado.
- Codigo ya usado.
- Tenant incorrecto.
- Empleado inexistente sin enumeracion.

Commit esperado: `phase: EAA26-03 task: backend invitaciones empleado`.


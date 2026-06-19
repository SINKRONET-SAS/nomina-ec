# Contrato EAA26 - Flujo de invitacion y activacion de empleado

## Actor OWNER/RRHH

Puede:

- Generar invitaciones para empleados del tenant.
- Descargar o copiar link/QR/codigo.
- Reenviar invitaciones vigentes o vencidas bajo limite.
- Revocar invitaciones.
- Ver bloqueos por datos incompletos.

No puede:

- Invitar empleados de otro tenant.
- Saltar consentimiento LOPDP.
- Activar marcacion sin zona, jornada y unidad.

## Actor empleado

Puede:

- Abrir la app en Expo Go o app publicada.
- Ingresar codigo, email o cedula segun politica.
- Crear o confirmar clave con opcion de ver/ocultar.
- Aceptar privacidad y geolocalizacion.
- Registrar asistencia si su ficha esta completa.

No puede:

- Elegir empresa manualmente si el codigo ya determina tenant.
- Modificar datos laborales sensibles desde la activacion.
- Marcar asistencia si el backend devuelve bloqueo de configuracion.

## Datos minimos

Invitacion:

- `tenant_id`.
- `employee_id`.
- `invite_code_hash`.
- `status`.
- `expires_at`.
- `created_by_user_id`.
- `accepted_at`.
- `revoked_at`.
- `resend_count`.
- `privacy_notice_version`.

Vinculo app-empleado:

- `tenant_id`.
- `employee_id`.
- `user_id`.
- `status`.
- `activated_at`.
- `last_seen_at`.
- `device_hint_hash` si se adopta control por dispositivo.

Marcacion:

- `tenant_id`.
- `employee_id`.
- `period_id` o periodo operacional.
- `operational_date`.
- `marking_zone_id`.
- `organizational_unit_id`.
- `schedule_id`.
- `latitude`, `longitude`, `accuracy`.
- `source`.
- `audit_correlation_id`.

## Politica de errores

Errores publicos:

- `INVITE_INVALID_OR_EXPIRED`: mensaje generico.
- `INVITE_ALREADY_USED`: mensaje generico con opcion de soporte.
- `EMPLOYEE_APP_CONFIG_BLOCKED`: mensaje visible con items faltantes para RRHH.
- `ATTENDANCE_NOT_READY`: no marca y explica condicion operativa.

Errores internos:

- Deben registrar tenant, employee id, actor, endpoint, correlation id y causa segura.


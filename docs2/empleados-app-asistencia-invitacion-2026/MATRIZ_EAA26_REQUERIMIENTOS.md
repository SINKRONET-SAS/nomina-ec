# Matriz EAA26 - Empleados App Asistencia Invitacion 2026

| ID | Prioridad | Necesidad | Adaptacion desde referencia | Criterio de aceptacion |
|----|-----------|-----------|-----------------------------|------------------------|
| EAA-R01 | P0 | Invitar empleados existentes, no crear empresas desde app | Staff invite de `sinkroniq-mobile` | RRHH puede generar invitacion solo para empleado activo del tenant. |
| EAA-R02 | P0 | Codigo de activacion seguro | Hash + expiracion + reintentos de staff invite | El codigo nunca se guarda en claro y vence segun politica. |
| EAA-R03 | P0 | Evitar enumeracion | Respuestas genericas en auth/invite | Errores publicos no revelan si email, cedula o empleado existen. |
| EAA-R04 | P0 | Vincular app a ficha laboral | `TeamMembership` adaptado a `Empleado` | Usuario movil queda ligado a `empleado_id` y `tenant_id` en transaccion. |
| EAA-R05 | P0 | Consentimiento LOPDP | `AcceptStaffInviteScreen` privacidad v2.1 | Activacion exige privacidad, tratamiento de datos y geolocalizacion. |
| EAA-R06 | P0 | Ojo de clave y confirmacion | Pantalla mobile de invitacion | Campos de clave y confirmacion permiten ver/ocultar contenido. |
| EAA-R07 | P0 | Panel RRHH visible | Mi equipo/invitaciones | Web muestra pendientes, activadas, vencidas, revocadas y bloqueadas. |
| EAA-R08 | P0 | Unidad organizativa con zona | Reglas Nomina-Ec de marcacion | Cada unidad con asistencia requiere zona vigente o herencia explicita. |
| EAA-R09 | P0 | Jornada obligatoria | Reglas de asistencia Nomina-Ec | App bloquea marcacion si el empleado no tiene jornada activa. |
| EAA-R10 | P0 | Periodo operacional en marcaciones | Regla de novedades con periodo | Marcacion se asocia a periodo/fecha operacional sin bug UTC. |
| EAA-R11 | P0 | Multi-tenant real | No confiar en parametros publicos | Todas las consultas filtran tenant y empleado con indices. |
| EAA-R12 | P0 | Indices necesarios | Migraciones GrowPartner/staff con indices | Hay indices por tenant, empleado, estado, expiracion y codigo hash. |
| EAA-R13 | P1 | Deep link/QR | Deep link `staff/accept-invite` | Link abre pantalla de activacion con codigo prellenado. |
| EAA-R14 | P1 | Reenvio y revocacion | `resendStaffInvite` | RRHH puede reenviar/revocar con auditoria y limites. |
| EAA-R15 | P1 | Recuperacion de acceso | Email verification/resend | Empleado puede recuperar acceso sin duplicar ficha laboral. |
| EAA-R16 | P1 | Metricas operativas | Dashboard de referidos/adopcion | RRHH ve tasa de activacion, bloqueos y empleados sin app. |
| EAA-R17 | P0 | Fail-closed en asistencia | Zero silent failures | Ante error de configuracion, la app muestra bloqueo claro y no marca. |
| EAA-R18 | P0 | QA Expo Go economico | Enfoque solicitado por usuario | Smoke documentado con comando Expo Go y backend LAN. |

## Estados sugeridos

| Estado | Uso |
|--------|-----|
| `PENDING_INVITE` | Invitacion emitida, aun no aceptada. |
| `ACTIVE` | Empleado activo en app y habilitado para asistencia. |
| `EXPIRED` | Codigo vencido. |
| `REVOKED` | Invitacion anulada por OWNER/RRHH. |
| `BLOCKED_CONFIG` | Falta unidad, zona, jornada o politica requerida. |
| `DISABLED` | Acceso movil suspendido sin eliminar ficha laboral. |

## Indices minimos a validar en fase EAA26-02

- `employee_app_invites(tenant_id, employee_id, status)`.
- `employee_app_invites(invite_code_hash)` unico parcial para invitaciones activas.
- `employee_app_invites(tenant_id, status, expires_at)`.
- `employee_app_links(tenant_id, employee_id)` unico para vinculo activo.
- `employee_app_links(user_id, tenant_id)`.
- `attendance_records(tenant_id, employee_id, operational_date)`.
- `attendance_records(tenant_id, period_id, employee_id)`.
- `organizational_units(tenant_id, marking_zone_id)` o equivalente si la zona se modela por relacion.


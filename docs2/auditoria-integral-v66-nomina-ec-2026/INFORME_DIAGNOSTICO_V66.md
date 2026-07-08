# Informe Diagnostico V66 - nomina-ec

Fecha: 2026-07-07  
Fuente revisada: `AuditoriaIntegral2026V66.jsx` y `v66data.jsx`.

## Hallazgos reconfirmados

### V66-01 - Email de rol de pago PDF

Aplica a `nomina-ec` con matiz. El backend tenia `sendRolPagoDisponible()` integrado al cierre mensual, pero ese flujo solo notificaba disponibilidad del rol. No existia una funcion dedicada para enviar el PDF individual como adjunto, ni endpoint protegido para que RRHH lo dispare desde PWA.

Resolucion ejecutada:

- `sendEmail()` acepta adjuntos buffer sin acceso a archivos o URL.
- `sendRolPagoEmail()` envia el rol PDF con plantilla transaccional y `required: true`.
- `generatePayrollRolePdf()` puede devolver buffer solo cuando se solicita.
- `POST /api/nomina/:id/rol-email` exige owner/admin_rrhh, usuario fresco, rol cerrado y email del empleado.
- `RolesPagos.jsx` agrega accion de envio por email.

### V66-02 - Soporte medico en permisos

Confirmado. La app movil tenia texto placeholder para una version futura. El backend no recibia, validaba ni almacenaba soporte medico de permisos, y la PWA de aprobacion no mostraba evidencia adjunta.

Resolucion ejecutada:

- `PermisosScreen` usa `expo-image-picker` para adjuntar imagen JPG/PNG hasta 3 MB.
- `mobileController.solicitarPermiso()` valida tipo/tamano, sube soporte a almacenamiento documental y guarda solo metadata.
- `/api/novedades` y el historial del empleado resuelven URL fresca de soporte.
- `PermisosOperacion.jsx` muestra soporte adjunto con enlace de revision sin preview inline.

## Riesgos residuales

- SMTP productivo requiere variables reales antes de envios transaccionales.
- La revision legal/medica del contenido adjunto corresponde a RRHH; SKNOMINA solo conserva evidencia y trazabilidad.
- El selector movil cubre imagenes; PDF queda aceptado por backend para integracion futura o cliente alterno.

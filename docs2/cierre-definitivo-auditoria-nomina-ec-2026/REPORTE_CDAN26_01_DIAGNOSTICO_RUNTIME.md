# Reporte CDAN26-01 - Diagnostico runtime

## Resultado

Se reviso el runtime real de `nuevo_nomina` contra los hallazgos CDAN26.

## Hallazgos reconciliados

- SEC-NEC-01: `render.yaml` ya usa `nomina-ec-postgres`, `nomina_ec` y `nomina_ec_app`; no quedan nombres `plan_haiky` / `haiky_migration` en infraestructura activa.
- LEG-NEC-01: Fondo de Reserva ya existia como `modalidad_fondo_reserva` por empleado con modalidades `mensual` / `iess_directo`.
- SADM-NEC-01: `Parametrizacion.jsx` ya expone valores legales para superadmin/owner/admin_rrhh.
- LEG-NEC-03: faltaba Formulario 107 individual; se cierra en PDF.
- BUG-NEC-01: `calcularMes()` actualizaba `payroll_periods` fuera de la misma transaccion del motor.
- COM-NEC-01: faltaba `sendRolPagoDisponible()`.
- MON-NEC-01: pagos reales existen con PayPhone; CDAN26 agrega contrato multi-proveedor y bloqueo explicito para Stripe declarado sin implementacion.
- Novedades manuales: existia backend, pero la pantalla era solo de pendientes; se agrega ingreso manual y carga masiva.

## Evidencia

- `render.yaml`
- `backend/src/controllers/nominaController.js`
- `backend/src/services/calculoNominaService.js`
- `backend/src/services/sriFormulario107Service.js`
- `frontend-web/src/pages/Asistencia/NovedadesPendientes.jsx`
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx`


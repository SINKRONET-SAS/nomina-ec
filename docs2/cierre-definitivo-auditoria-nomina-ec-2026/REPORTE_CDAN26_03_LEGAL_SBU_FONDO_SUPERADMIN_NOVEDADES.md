# Reporte CDAN26-03 - Legal laboral, SBU, Fondo de Reserva, Superadmin y novedades

## Cierre

- El motor bloquea nominas con sueldo mensual inferior al SBU vigente configurado, salvo excepcion legal auditada en metadata del empleado.
- Fondo de Reserva conserva modalidad por empleado `mensual` / `iess_directo` y se refleja en detalle de calculo.
- Superadmin/owner/admin_rrhh ya gestionan valores legales desde `Parametrizacion.jsx`.
- La pantalla de novedades ahora permite ingreso manual.
- La carga masiva de novedades queda soportada con plantilla CSV descargable.
- Las novedades por tiempo se muestran como horas redondeadas a 2 decimales; internamente se conservan minutos para trazabilidad.

## Archivos principales

- `backend/src/services/calculoNominaService.js`
- `backend/src/services/payrollNoveltyService.js`
- `backend/src/controllers/novedadController.js`
- `frontend-web/src/pages/Asistencia/NovedadesPendientes.jsx`
- `frontend-web/src/components/Layout/Layout.jsx`

## Validacion

- `calculoNominaService.test.js`
- `payrollNoveltyService.cdan26.test.js`


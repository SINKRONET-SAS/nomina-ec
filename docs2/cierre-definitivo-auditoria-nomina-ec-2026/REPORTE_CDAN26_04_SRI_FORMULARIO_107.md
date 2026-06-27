# Reporte CDAN26-04 - SRI Formulario 107 individual

## Cierre

Se implemento Formulario 107 individual en PDF, consistente con el flujo SRI/RDEP:

- Precheck por empleado/anio.
- Bloqueo si faltan RUC, razon social, identificacion del trabajador o roles del anio.
- Generacion PDF individual con resumen anual y detalle mensual.
- Version de plantilla `FORM107-SRI-2026-CDAN26`.
- Auditoria `generar_formulario_107`.
- UI en `Reportes Entidades` con selector de empleado, validacion y descarga.

## Archivos principales

- `backend/src/services/sriFormulario107Service.js`
- `backend/src/controllers/reporteController.js`
- `backend/src/app.js`
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx`

## Validacion

- `sriFormulario107Service.test.js`

## Riesgo residual

La estructura PDF debe validarse contra ficha tecnica SRI vigente antes de presentacion oficial.


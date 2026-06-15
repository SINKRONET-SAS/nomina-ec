# REPORTE CBN26-02 - Boton PDF en Nomina

Estado: completed_local
Fecha: 2026-06-14

## Resultado

El boton de PDF en roles de pago ya no depende de fetch directo ni de token inexistente. La UI usa `authenticatedApi`, abre el PDF con `noopener,noreferrer`, bloquea el boton durante descarga y muestra mensajes de exito/error.

Archivos:

- `frontend-web/src/pages/Nomina/RolesPagos.jsx`
- `backend/src/controllers/nominaController.js`

## Validacion

- Frontend build paso.
- `rg` no encontro dependencias Base44.
- Error simulado de PDF queda visible con mensaje del backend.

## Riesgo residual

La generacion efectiva del PDF sigue dependiendo de que `rol_pdf_url` sea creado por el flujo documental correspondiente.

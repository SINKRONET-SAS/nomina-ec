# CDANV6S-02 Rol PDF y Email

Resultado: cerrado previo o equivalente.

- `backend/src/app.js` registra `GET /api/nomina/:id/rol-pdf`.
- `backend/src/controllers/nominaController.js` expone `descargarRolPDF`.
- `backend/src/services/payrollRolePdfService.js` expone `generatePayrollRolePdf`.
- `backend/src/services/communicationService.js` expone `sendRolPagoDisponible` y plantilla de rol.
- `cerrarMes()` invoca `sendRolPagoDisponible` por cada rol cerrado y reporta resultados.

La funcion externa sugerida `sendRolPagoEmail` no se agrega porque el contrato activo ya existe y esta consumido.

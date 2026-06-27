# Reporte CDAN26-05 - Calculo mensual transaccional

## Cierre

`calcularMes()` ahora abre un cliente transaccional y lo pasa al motor de calculo. Quedan dentro de la misma transaccion:

- Creacion de lote de calculo.
- Insercion/actualizacion de nominas.
- Lineas normalizadas de calculo.
- Mapeos contables asegurados para el calculo.
- Estado `payroll_periods` como `calculated` o `calculation_failed`.

Si ocurre error, se ejecuta rollback y se registra error estructurado con correlationId.

## Archivos principales

- `backend/src/controllers/nominaController.js`
- `backend/src/services/calculoNominaService.js`
- `backend/src/services/payrollAccountingService.js`
- `backend/src/services/beneficioEmpleadoService.js`
- `backend/src/services/payrollNoveltyService.js`

## Validacion

- `nominaController.test.js`
- `calculoNominaService.test.js`


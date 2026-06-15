# REPORTE CBN26-05 - Deducciones de anticipos y prestamos

Estado: completed_local
Fecha: 2026-06-14

## Resultado

El motor de nomina dejo de usar `anticipos = 0` y `prestamos = 0`.

Cambios:

- `calculoNominaService.js` consulta `getApprovedDeductions` para cada empleado/periodo.
- Solo beneficios `aprobado` y con saldo pendiente entran al calculo.
- El detalle de calculo incluye `beneficiosDescontados` para trazabilidad.
- Al cerrar nomina, `nominaController.cerrarMes` descuenta saldos una sola vez porque solo procesa nominas en estado `borrador`.
- `CerrarMes.jsx` muestra anticipos y prestamos en el detalle por empleado.

## Validacion

- `backend/src/services/beneficioEmpleadoService.test.js` verifica agrupacion por tipo.
- `npm test -- --runInBand`: 9 suites, 22 tests.
- `rg "const anticipos = 0|const prestamos = 0"` sin coincidencias.

## Riesgo residual

No se implemento plan de amortizacion avanzado; cada beneficio usa cuota mensual y saldo pendiente.

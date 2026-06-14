# Reporte ONI26-FUNC-03 - Beneficios sociales obligatorios 2026

## Resultado

Se completo la carga legal obligatoria con beneficios sociales requeridos para nomina Ecuador:

- Decimo tercer sueldo.
- Decimo cuarto sueldo Costa/Galapagos.
- Decimo cuarto sueldo Sierra/Amazonia.
- Fondo de reserva.

## Implementacion

- `backend/src/config/legal-ecuador.js` ahora define reglas base 2026 para decimos y fondo de reserva.
- `loadMandatoryLegalParameters` carga esos parametros en `legal_parameter_versions`.
- `legalParameterService` lee versiones parametrizadas de estos beneficios y las fusiona con la base legal del anio.
- `calculoNominaService` usa tasas parametrizadas para provision de decimos y fondo de reserva.
- La UI informa que la carga obligatoria incluye decimos y fondo de reserva.

## Criterio normativo

La regla base queda parametrizada conforme a criterios de Codigo del Trabajo usados por el sistema:

- Decimo tercero: doceava parte de remuneraciones del periodo anual, pago en diciembre.
- Decimo cuarto: equivalente a un SBU anual, con calendario regional Costa/Galapagos y Sierra/Amazonia.
- Fondo de reserva: provision desde el primer anio cumplido, pagable al trabajador o depositable en IESS segun eleccion.

Todos los registros quedan como `pendiente_validacion_oficial` hasta revision profesional/fuente vigente.

## Validaciones

- `node --check backend/src/services/configurationService.js`
- `node --check backend/src/services/legalParameterService.js`
- `node --check backend/src/services/calculoNominaService.js`
- `npm.cmd run build` en `frontend-web`
- `npm.cmd test -- --runInBand` en `backend`

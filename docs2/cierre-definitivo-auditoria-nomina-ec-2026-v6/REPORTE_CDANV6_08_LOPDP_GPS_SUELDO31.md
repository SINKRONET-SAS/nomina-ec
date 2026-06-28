# REPORTE CDANV6-08 - LOPDP GPS Y SUELDO DIA 31

## Resultado

Estado: `completed_local`

Se cerraron los dos hallazgos P0 de mobile/legal laboral.

## Cambios

- `app-movil/src/screens/MarcacionScreen.js` muestra aviso LOPDP antes de solicitar permiso GPS cuando el permiso aun no fue concedido.
- Si el trabajador cancela el aviso, no se solicita GPS y se muestra estado comprensible.
- `backend/src/services/liquidacionService.js` calcula dias pendientes con tope de 30 para salida en dia 31.
- `backend/src/services/liquidacionService.test.js` cubre dias 28, 30 y 31.

## Verificacion

- `npm.cmd --workspace=backend test -- sriRdepGenerator.test.js liquidacionService.test.js --runInBand`: PASS.
- `npm.cmd run check:mobile`: PASS.
- Backend test completo: PASS, 49 suites, 204 tests.

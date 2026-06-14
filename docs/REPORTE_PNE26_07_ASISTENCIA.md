# REPORTE PNE26-07 - Marcaciones y novedades

Estado: completed_local
Fecha: 2026-06-14

## Resultado

Se verifico registro de marcaciones con GPS, Haversine, control de fuera de perimetro, novedades y aprobacion por roles autorizados.

## Evidencia

- `backend/src/services/marcacionValidator.js`
- `backend/src/controllers/marcacionController.js`
- `backend/src/controllers/novedadController.js`
- `backend/src/middleware/reglasIrrenunciables.js`
- `app-movil/src/screens/MarcacionScreen.js`

## Validaciones

- `backend/src/services/marcacionValidator.test.js` cubre geocerca.
- No existe ruta publica de eliminacion de marcaciones.

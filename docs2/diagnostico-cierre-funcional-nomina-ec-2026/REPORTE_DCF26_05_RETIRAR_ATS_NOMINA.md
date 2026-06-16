# Reporte DCF26-05 - Retirar ATS del flujo de nomina

Fecha: 2026-06-15  
Fase: `DCF26-05`  
Resultado: completada.

## Cambio realizado

ATS fue retirado del runtime de reportes de nomina:

- se elimino la ruta `POST /api/reportes/ats`;
- se retiro `generarATS` del controlador de reportes;
- se elimino `backend/src/services/sriAtsGenerator.js`;
- se mantuvo el criterio de frontend: ATS no se muestra en reportes de nomina porque corresponde a obligaciones tributarias generales, no al proceso RDEP de relacion de dependencia.

## Validacion

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Runtime sin ATS nomina | PASS | `rg "reportes/ats|generarATS|generarXML_ATS|sriAtsGenerator" backend/src frontend-web/src app-movil/src` sin coincidencias. |
| Sintaxis backend | PASS | `node --check src/controllers/reporteController.js` y `node --check src/app.js`. |
| Reportes principales | PASS | `npm.cmd test -- sriRdepGenerator.test.js iessSaeGenerator.test.js bancoAebGenerator.test.js --runInBand`: 10 tests. |

## Resultado funcional

El flujo de nomina queda enfocado en RDEP, SAE/IESS y archivo bancario. ATS ya no puede generarse desde endpoints operativos de nomina.

# Reporte DCF26-04 - RDEP XSD runtime

Fecha: 2026-06-15  
Fase: `DCF26-04`  
Resultado: completada con gate estructural versionado.

## Cambio realizado

RDEP deja de ser una descarga directa opaca. Ahora tiene:

- endpoint `POST /api/reportes/rdep/precheck`;
- precheck de RUC, razon social, nomina cerrada y XSD versionado;
- generacion bloqueada si el precheck falla;
- lectura runtime de `backend/src/config/rdep/Esquema_RDEP_2023.xsd`;
- hash SHA-256 del XSD en precheck y respuesta de generacion;
- validacion estructural del XML generado contra el contrato XSD versionado;
- UI visible de precheck en `Reportes para entidades publicas`.

## Archivos modificados

- `backend/src/services/sriRdepGenerator.js`
- `backend/src/controllers/reporteController.js`
- `backend/src/app.js`
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx`
- `backend/src/services/sriRdepGenerator.test.js`

## Validacion

| Gate | Estado | Evidencia |
|------|--------|-----------|
| RDEP tests | PASS | `npm.cmd test -- sriRdepGenerator.test.js --runInBand`: 4 tests. |
| Backend syntax | PASS | `node --check src/services/sriRdepGenerator.js` y `node --check src/controllers/reporteController.js`. |
| Frontend build | PASS | `npm.cmd run build` en `frontend-web`. |
| UI visible | PASS | Boton `Validar RDEP` y checks visibles antes de generar. |

## Nota legal

Este gate no declara cumplimiento tributario total. La validacion implementada es estructural y usa el XSD versionado disponible en el repositorio. Antes de produccion se debe confirmar ficha tecnica vigente del ejercicio fiscal objetivo con fuente oficial SRI y revision profesional.

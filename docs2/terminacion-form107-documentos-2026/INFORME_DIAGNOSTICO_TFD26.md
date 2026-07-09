# Informe Diagnostico TFD26

## Resultado

Los hallazgos reportados aplican a `nomina-ec`. La revision directa del codigo confirmo brechas reales en backend, PWA y documentos. No se reportan como falsos positivos.

## Diagnostico operativo

- La pantalla de terminacion exponia solo cuatro opciones y mantenia `Desahucio (Art. 186)`, referencia incorrecta frente a la estructura vigente del Codigo del Trabajo.
- El backend intentaba llamar `generarActaFiniquito` desde `templateGenerator.js`, pero la funcion no existia ni se exportaba.
- El calculo de indemnizacion por despido no trataba la fraccion de anio como anio completo.
- La bonificacion por desahucio no se calculaba para mutuo acuerdo ni despido intempestivo.
- Las horas extra se calculaban con multiplicadores literales `1.5` y `2`.
- El Formulario 107 no separaba campos claves del comprobante anual ni dejaba referencia SRI/RDEP suficiente.
- La ficha laboral mostraba documentos con `href={documento.documento_url}`, omitiendo el endpoint de descarga que resuelve storage local o firmado.
- La descarga de documentos legales usaba `resolveStorageUrl(..., storageKey)` aun cuando el storage no era local, lo que podia producir rutas invalidas para Safari/S3.

## Solucion aplicada

- `backend/src/config/terminationCauses.js` centraliza causales Ecuador.
- `backend/src/services/liquidacionService.js` valida periodo de prueba, corrige calculo de desahucio/indemnizacion y usa la causal homologada.
- `backend/src/services/templateGenerator.js` genera y registra acta de finiquito PDF.
- `frontend-web/src/pages/Empleados/TerminarEmpleado.jsx` consume causales del backend y deshabilita causales con revision previa.
- `backend/src/services/payrollNoveltyService.js`, `calculoNominaService.js`, `legalParameterService.js` y `configurationService.js` convierten horas extra en parametros visibles.
- `backend/src/services/sriFormulario107Service.js` refuerza el PDF con resumen anual compatible con RDEP/Formulario 107 y trazabilidad SRI.
- `backend/src/controllers/documentoLegalController.js` resuelve descargas locales o S3 firmadas.
- `frontend-web/src/pages/Empleados/HistorialEmpleado.jsx` agrega carga documental laboral y descarga por backend.

## Riesgos residuales

- Visto bueno, caso fortuito/fuerza mayor, muerte o incapacidad total quedan visibles pero no automatizados, porque requieren expediente/resolucion y revision legal.
- Formulario 107 requiere validacion tributaria profesional y comparacion contra plantilla oficial SRI antes de uso oficial.
- Las migraciones PostgreSQL deben aplicarse antes de cargar los nuevos tipos documentales en produccion.

## Validacion de cierre

- Backend completo: PASS, 52 suites y 273 tests con Jest serial.
- Ruta nueva `GET /api/empleados/terminacion/causas`: PASS en contrato `app.routes.test.js`.
- Prisma schema: PASS con binario local `backend/.\\node_modules\\.bin\\prisma.cmd validate`.
- PWA build: PASS con Vite; artefactos generados correctamente.
- `git diff --check`: PASS.
- UTF-8 sin BOM: PASS en archivos modificados y nuevos gobernados por `RULES.md`.

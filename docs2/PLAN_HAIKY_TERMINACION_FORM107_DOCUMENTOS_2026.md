# HAIKY-TERMINACION-FORM107-DOCUMENTOS-2026

Codigo: TFD26  
Estado: completed-pass  
Fecha: 2026-07-08  
Repositorio: `SINKRONET-SAS/nomina-ec`

## Fuente del requerimiento

Hallazgos reportados por el usuario:

- Causales de terminacion laboral incompletas para Ecuador; falta terminacion unilateral dentro del periodo de prueba.
- Error runtime `generarActaFiniquito is not a function`.
- Calculo de horas extra no visible ni parametrizable.
- Formulario 107 no cumple una estructura suficiente frente a SRI/RDEP.
- Ficha del empleado sin seccion integral para contrato firmado, aviso de entrada IESS, acta de dotacion firmada y otros documentos.
- Contratos generados no descargan; Safari reporta direccion no valida.

## Fuentes oficiales reconfirmadas

- Ministerio del Trabajo, Biblioteca Legal, Codigo del Trabajo: Art. 15 periodo de prueba hasta 90 dias y terminacion libre por cualquiera de las partes; Arts. 169, 172, 173, 184, 185, 188 y 595 para causales, desahucio, despido y finiquito.
- SRI, Anexo RDEP/Formulario 107: Programa RDEP periodo fiscal 2026 actualizado el 17 de marzo de 2026, Formulario 107, ficha tecnica, catalogo, plantilla Excel y XSD publicados en `https://www.sri.gob.ec/formularios-e-instructivos1`.

## Hallazgos reconfirmados

| ID | Severidad | Hallazgo | Confirmacion |
|----|-----------|----------|--------------|
| TFD26-F01 | Alta | `generarActaFiniquito` importado pero no exportado | Confirmado en `liquidacionService.js` y `templateGenerator.js`. |
| TFD26-F02 | Alta | Causales de terminacion incompletas y desahucio con articulo incorrecto en UI | Confirmado en `TerminarEmpleado.jsx`. |
| TFD26-F03 | Alta | Periodo de prueba unilateral no existe | Confirmado contra UI y Codigo del Trabajo Art. 15. |
| TFD26-F04 | Media | Desahucio/mutuo acuerdo/despido no aplicaban bonificacion con matriz legal completa | Confirmado en `calcularDesahucio`. |
| TFD26-F05 | Media | Indemnizacion por despido usa anios completos por `floor` y no fraccion como anio completo | Confirmado en `calcularIndemnizacionDespidoIntempestivo`. |
| TFD26-F06 | Alta | Horas extra hardcodeadas con `1.5` y `2` | Confirmado en `payrollNoveltyService.js`. |
| TFD26-F07 | Media | Formulario 107 PDF es demasiado generico | Confirmado en `sriFormulario107Service.js`. |
| TFD26-F08 | Alta | Descarga documental puede devolver URL local o cruda invalida para Safari/S3 | Confirmado en `documentoLegalController.js` y `HistorialEmpleado.jsx`. |
| TFD26-F09 | Media | Ficha laboral no expone carga documental integral | Confirmado en `HistorialEmpleado.jsx`; `NuevoEmpleado.jsx` solo adjuntaba contrato firmado como `contrato`. |

## Fases

| Fase | Estado | Entregable |
|------|--------|------------|
| TFD26-00 | completed | Plan, informe, prompts, contexto y baseline de hallazgos. |
| TFD26-01 | completed | Causales Ecuador, periodo de prueba, finiquito PDF y calculo legal corregido. |
| TFD26-02 | completed | Horas extra parametrizables y Formulario 107 reforzado con trazabilidad SRI/RDEP. |
| TFD26-03 | completed | Ficha laboral documental y descarga segura Safari/S3/local. |
| TFD26-04 | completed-pass | QA, AuditLock, commit y push. |

## Reglas de ejecucion

- No habilitar causales que requieren visto bueno o revision legal como calculo automatico ficticio.
- El periodo de prueba solo genera finiquito automatico dentro de 90 dias.
- Formulario 107 queda como comprobante trazable generado por SKNOMINA; requiere validacion tributaria profesional antes de entrega oficial.
- Toda descarga documental debe pasar por backend y resolver URL local o firmada segun storage activo.
- Los tipos documentales de ficha laboral se guardan como enum explicito, no como metadata opaca.

## Gates previstos

- `npm.cmd --workspace=backend test -- liquidacionService.tfd26.test.js payrollNoveltyService.cdan26.test.js sriFormulario107Service.test.js calculoNominaService.test.js --runInBand`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=frontend-web run build`
- `git diff --check`
- UTF-8 sin BOM en archivos modificados `.js`, `.jsx`, `.md`, `.json`, `.prisma` y `.sql`.

## Gates ejecutados

- `node .\node_modules\jest\bin\jest.js --runInBand` en `backend`: PASS, 52 suites y 273 tests.
- `node .\node_modules\jest\bin\jest.js app.routes.test.js --runInBand --verbose`: PASS, 23 tests.
- `.\node_modules\.bin\prisma.cmd validate` en `backend`: PASS.
- `npm.cmd --workspace=frontend-web run build`: PASS, Vite genero artefactos y reporto `built in 2m 15s`; el proceso no libero prompt y se cerro por PID despues del resultado verde.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.
- UTF-8 sin BOM en archivos modificados y nuevos gobernados: PASS.

## Nota de cierre

El comando raiz `npm.cmd run prisma:validate` quedo bloqueado en la envoltura `npm -> prisma validate`; se cerro el arbol y se valido el mismo esquema con el binario local de Prisma desde `backend`, con resultado PASS.

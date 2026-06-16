# Reporte DCF26-01 - Diagnostico Consultivo

Fecha: 2026-06-15  
Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Rol: consultor funcional, tecnico y de producto.

## Veredicto

Nomina-Ec ya no esta en cero: backend, frontend y app tienen avances reales y los gates locales principales pasan. Sin embargo, todavia hay una diferencia importante entre lo que la UI comunica y lo que el sistema ejecuta. La principal deuda ya no es "falta pantalla"; ahora es "pantalla visible sin flujo operacional completo".

La segunda pasada debe concentrarse en cerrar funcionalidad real detras de cada promesa: bancos parametrizados que gobiernen el archivo, RDEP validado por XSD, API externa consumible, importacion masiva ejecutable, apertura de mes con lotes reales, SUPERADMIN sin duplicidades y avance operativo medido por readiness verificable.

## Verificaciones ejecutadas

| Verificacion | Resultado |
|--------------|-----------|
| `npm.cmd test -- --runInBand` en `backend` | PASS: 9 suites, 22 tests. Riesgo: 182.121 s, `bancoAebGenerator.test.js` 166.267 s. |
| `npm.cmd run build` en `frontend-web` | PASS: Vite build, PWA y service worker generados. |
| `npx.cmd prisma validate` en `backend` | PASS: schema valido. |
| `npm.cmd run check:stores` en `app-movil` | PASS: identificadores, URLs y assets requeridos. |
| Revision estatica con `rg` | FINDINGS: catalogos genericos, ATS backend, `alert`, `window.open`, mojibake, artefactos muertos. |

## Hallazgos P0

### DCF26-F01 - Modulos visibles sin proceso real

`OperacionIntegral` usa un formulario generico y persiste todo en `configuration_catalogs`. Esto deja registros visibles, pero no ejecuta contabilidad, API keys, importaciones, RDEP, store readiness ni dashboard.

Evidencia:

- `frontend-web/src/pages/Operacion/OperacionIntegral.jsx:74`
- `frontend-web/src/pages/Operacion/OperacionIntegral.jsx:193`
- `backend/src/services/configurationService.js:21`

Riesgo: el usuario cree que configuro una capacidad operacional, pero solo creo un JSON.

### DCF26-F02 - Bancos OWNER desconectados del generador

Parametrizacion permite registrar bancos y archivos planos, pero `bancoAebGenerator` toma perfiles desde `backend/src/config/bank-file-profiles.json`, no desde `perfiles_bancarios`.

Evidencia:

- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx:310`
- `backend/src/services/bancoAebGenerator.js:8`
- `backend/src/services/bancoAebGenerator.js:13`
- `backend/src/services/bancoAebGenerator.js:46`

Riesgo: un OWNER puede llenar un formato bancario que no afecta la salida real.

### DCF26-F03 - RDEP no esta listo para envio oficial

Hay XSD versionado y demo, pero el generador runtime no valida contra XSD ni incluye una reconciliacion automatica con ficha vigente.

Evidencia:

- `backend/src/services/sriRdepGenerator.js:5`
- `backend/src/services/sriRdepGenerator.js:40`
- `backend/src/config/rdep/rdep-source-manifest.json:38`

Riesgo: archivo rechazado por SRI o cumplimiento declarado sin evidencia suficiente.

### DCF26-F04 - ATS sigue activo en backend de nomina

El frontend ya no muestra ATS, pero backend conserva ruta y controlador.

Evidencia:

- `backend/src/app.js:120`
- `backend/src/controllers/reporteController.js:4`
- `backend/src/controllers/reporteController.js:11`

Riesgo: contradiccion funcional con el criterio acordado: ATS no pertenece al flujo de nomina.

### DCF26-F05 - API externa documentada pero no consumible

Existe contrato `public-api-contract.json` con `/api/v1`, pero `app.js` no expone rutas versionadas ni middleware de scopes/idempotencia para clientes externos.

Evidencia:

- `backend/src/config/public-api-contract.json:6`
- `backend/src/config/public-api-contract.json:7`
- `backend/src/app.js`

Riesgo: integracion con otros sistemas queda como promesa no ejecutable.

### DCF26-F06 - Avance operativo demasiado optimista

El avance se completa por pasos marcados y conteos basicos. No verifica que una configuracion alimente el proceso productivo correspondiente.

Evidencia:

- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx:667`
- `backend/src/services/configurationService.js:635`

Riesgo: el dashboard puede comunicar readiness cuando faltan validaciones reales.

### DCF26-F07 - Carga masiva y apertura mensual no ejecutan flujo

Los modulos existen en `operationalModules`, pero se guardan como catalogo. No hay upload, parseo, validacion, rollback, apertura real de periodo ni lote de novedades procesable.

Evidencia:

- `frontend-web/src/config/operationalModules.js`
- `frontend-web/src/pages/Operacion/OperacionIntegral.jsx:74`

Riesgo: procesos core de operacion mensual quedan sin funcionalidad.

## Hallazgos P1

### DCF26-F08 - SUPERADMIN duplicado como catalogo

Hay gestion real de planes en pagos, pero la operacion integral tambien registra planes/addons como catalogo generico. Se debe evitar doble fuente de verdad.

### DCF26-F09 - Mensajes tecnicos y UX fragil

Persisten `alert()` y `window.open()` en reportes, nomina y documentos. Esto rompe humanizacion, trazabilidad y manejo de estados.

Evidencia:

- `frontend-web/src/pages/Nomina/DescargarReportes.jsx:71`
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx:73`
- `frontend-web/src/pages/Nomina/CerrarMes.jsx:18`
- `frontend-web/src/pages/Documentos/ContratosGenerados.jsx:18`

### DCF26-F10 - Encoding inconsistente

Hay mojibake en backend y metadatos (`app.js`, `package.json`, mensajes de configuracion). Esto contradice `RULES.md`.

### DCF26-F11 - App movil lista para stores solo en forma basica

El chequeo de tiendas pasa, pero la app cubre login/registro y marcacion. Falta exponer politicas, borrado de cuenta desde app, roles/alcance, estados de asistencia y autoservicio minimo segun el producto prometido.

### DCF26-F12 - Codigo/documentos muertos

`docs2` contiene multiples `Qwen_python_*.py` con codigo heredado, ATS y fragmentos ya superados.

## Hallazgos P2

### DCF26-F13 - Pruebas lentas

La suite backend pasa pero tarda demasiado para una segunda pasada profunda. `bancoAebGenerator.test.js` tardo 166.267 s.

## Controles positivos

- El motor de nomina ya consulta parametros legales versionados desde `legal_parameter_versions`.
- Decimo tercero, decimo cuarto, fondo de reserva, SBU, IESS, jornada e IR estan considerados en la carga obligatoria y en el merge legal.
- La landing, PWA y app tienen avance de build/release basico.
- Los reportes de nomina ya corrigieron visualmente ATS en frontend, aunque backend sigue pendiente.
- Las pruebas existentes no fallan.

## Recomendacion consultiva

Ejecutar DCF26 como cierre funcional, no como plan de documentacion. Cada fase debe terminar con:

- pantalla visible o mejora UI real;
- endpoint/servicio especializado;
- importaciones conectadas;
- pruebas unitarias o E2E segun riesgo;
- evidencia en `docs2/diagnostico-cierre-funcional-nomina-ec-2026/`;
- AuditLock firmado.

La prioridad inmediata es DCF26-01 a DCF26-05: encoding, modulos reales, bancos, RDEP y retiro de ATS. Esos puntos atacan directamente la percepcion del usuario de que "hay algo oculto" o "solo backend/documentos".

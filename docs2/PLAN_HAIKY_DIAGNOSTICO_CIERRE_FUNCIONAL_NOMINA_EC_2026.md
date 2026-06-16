# Open Haiky Plan - HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026 |
| Codigo | DCF26 |
| Estado | abierto en fase documental consultiva |
| Fase actual | DCF26-00 cerrada documentalmente |
| Alcance | segunda pasada profunda para cerrar brechas entre promesas, pantallas y funcionalidad real de Nomina-Ec |
| Diagnostico | `docs2/diagnostico-cierre-funcional-nomina-ec-2026/REPORTE_DCF26_01_DIAGNOSTICO_CONSULTIVO.md` |
| Matriz | `docs2/diagnostico-cierre-funcional-nomina-ec-2026/MATRIZ_DCF26_HALLAZGOS.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026-{00..12}-*.md` |
| RULES | `RULES.md` |

## Resumen ejecutivo

DCF26 nace de una auditoria consultiva sobre codigo, pantallas y verificaciones locales. El sistema compila y las pruebas basicas pasan, pero aun conserva brechas relevantes: modulos visibles que guardan catalogos genericos sin ejecutar el proceso prometido, reportes oficiales sin validacion XSD/runtime completa, configuraciones OWNER que no gobiernan aun los generadores, una API externa documentada pero no expuesta, deuda de mensajes/encoding y artefactos documentales muertos.

El objetivo de DCF26 no es agregar mas promesas. Cada fase debe entregar funcionalidad real expuesta en frontend, importaciones correctas, rutas o servicios especializados, pruebas automatizadas y evidencia. Si una fase solo genera documentos, debe quedar bloqueada.

## Gates consultivos ejecutados

| Gate | Resultado | Evidencia |
|------|-----------|-----------|
| Reglas | PASS | `RULES.md` leido; incluye exposicion frontend obligatoria. |
| Backend tests | PASS con lentitud | `npm.cmd test -- --runInBand`: 9 suites, 22 tests, 182.121 s. |
| Frontend build/PWA | PASS | `npm.cmd run build`: Vite build y service worker generados. |
| Prisma schema | PASS | `npx.cmd prisma validate`: schema valido. |
| App store readiness | PASS parcial | `npm.cmd run check:stores`: identificadores, URLs y assets verificados. |
| Auditoria estatica | FINDINGS | Rutas, pantallas, servicios y documentos revisados con `rg` y lectura directa. |

## Hallazgos principales

| ID | Prioridad | Hallazgo | Evidencia | Impacto |
|----|-----------|----------|-----------|---------|
| DCF26-F01 | P0 | `OperacionIntegral` guarda JSON generico en `configuration_catalogs` para contabilidad, RDEP, API, importaciones, dashboard y stores. | `frontend-web/src/pages/Operacion/OperacionIntegral.jsx:74`, `backend/src/services/configurationService.js:21` | Pantallas visibles, pero sin proceso real ni contratos especializados. |
| DCF26-F02 | P0 | Los perfiles bancarios configurados por OWNER no gobiernan el generador bancario. | `backend/src/services/bancoAebGenerator.js:8`, `backend/src/services/bancoAebGenerator.js:13`, `backend/src/services/bancoAebGenerator.js:46` | El usuario puede llenar bancos, pero la emision usa JSON fijo. |
| DCF26-F03 | P0 | RDEP genera XML sin validacion XSD runtime ni reconciliacion vigente de ficha tecnica. | `backend/src/services/sriRdepGenerator.js:5`, `backend/src/services/sriRdepGenerator.js:40`, `backend/src/config/rdep/rdep-source-manifest.json:38` | Riesgo tributario y de archivo rechazado por SRI. |
| DCF26-F04 | P0 | ATS sigue expuesto en backend como reporte de nomina. | `backend/src/app.js:120`, `backend/src/controllers/reporteController.js:4`, `backend/src/controllers/reporteController.js:11` | Contradice la correccion funcional: para nomina aplica RDEP, no ATS. |
| DCF26-F05 | P0 | API externa esta documentada, pero no existe como `/api/v1` funcional. | `backend/src/config/public-api-contract.json:6`, `backend/src/config/public-api-contract.json:7`, `backend/src/app.js` | Integraciones prometidas no se pueden consumir. |
| DCF26-F06 | P0 | El avance operativo se puede completar por conteo minimo o creacion de registro, no por readiness real. | `frontend-web/src/pages/Configuracion/Parametrizacion.jsx:667`, `backend/src/services/configurationService.js:635` | La UI puede declarar lista una base que aun no opera. |
| DCF26-F07 | P0 | Carga masiva de empleados y apertura/lotes son configuraciones, no flujos ejecutables. | `frontend-web/src/config/operationalModules.js`, `frontend-web/src/pages/Operacion/OperacionIntegral.jsx:193` | Procesos criticos siguen sin ejecucion ni rollback. |
| DCF26-F08 | P1 | SUPERADMIN tiene gestion de planes real en pagos, pero `OperacionIntegral` duplica el concepto como catalogo. | `frontend-web/src/config/operationalModules.js`, `backend/src/controllers/paymentController.js` | Churn funcional y riesgo de fuentes de verdad paralelas. |
| DCF26-F09 | P1 | Persisten `alert()` y `window.open()` en flujos criticos. | `frontend-web/src/pages/Nomina/DescargarReportes.jsx:71`, `frontend-web/src/pages/Nomina/CerrarMes.jsx:18`, `frontend-web/src/pages/Documentos/ContratosGenerados.jsx:18` | Mensajes poco humanos, dificil trazabilidad y UX fragil. |
| DCF26-F10 | P1 | Hay mojibake en backend y metadatos. | `backend/src/app.js:1`, `backend/src/package.json`, `backend/src/services/configurationService.js` | Incumple regla UTF-8 y deteriora confianza. |
| DCF26-F11 | P1 | La app movil pasa chequeo de assets/stores, pero funcionalmente cubre solo login/registro y marcacion. | `app-movil/src/App.js`, `app-movil/src/services/api.js` | Readiness de tienda no equivale a app operativa integral. |
| DCF26-F12 | P1 | `docs2` contiene artefactos `Qwen_python_*.py` con codigo obsoleto y ATS heredado. | `docs2/Qwen_python_20260610_*.py` | Ruido documental y riesgo de reintroducir codigo muerto. |
| DCF26-F13 | P2 | La suite backend pasa, pero una prueba tarda 166 s. | `npm.cmd test -- --runInBand` | Ciclo QA lento y fragil para iteraciones. |

## Linea de cierre funcional

DCF26 convierte los hallazgos en una secuencia de cierre:

| Fase | Prioridad | Estado | Objetivo |
|------|-----------|--------|----------|
| DCF26-00 | P0 | completed | Baseline consultiva: diagnostico, matriz, contexto, prompts y AuditLock. |
| DCF26-01 | P0 | pending | Corregir encoding/mojibake y estabilizar mensajes base UTF-8. |
| DCF26-02 | P0 | pending | Reemplazar catalogos genericos de operacion por modulos con servicios reales. |
| DCF26-03 | P0 | pending | Conectar configuracion bancaria OWNER al generador real por ficha tecnica. |
| DCF26-04 | P0 | pending | RDEP productizable: ficha vigente, XSD validation, precheck y evidencia. |
| DCF26-05 | P0 | pending | Retirar ATS del flujo de nomina y dejarlo fuera o aislado como obligacion tributaria no nomina. |
| DCF26-06 | P0 | pending | API externa `/api/v1` con autenticacion, scopes, rate limits, idempotencia y auditoria. |
| DCF26-07 | P0 | pending | Carga masiva de empleados real con plantilla, validacion, rollback y reporte de errores. |
| DCF26-08 | P0 | pending | Apertura de mes y lotes de novedades ejecutables por estructura organizativa. |
| DCF26-09 | P1 | pending | SUPERADMIN real sin duplicar planes/addons/incidencias en catalogos paralelos. |
| DCF26-10 | P1 | pending | App movil y asistencia: permisos, politicas, offline controlado, evidencias y autoservicio minimo. |
| DCF26-11 | P1 | pending | Humanizacion UI/UX: eliminar `alert`, estados, toasts, errores accionables y pantallas vacias utiles. |
| DCF26-12 | P0 | pending | QA E2E, limpieza de codigo/documentos muertos, datos DEMO y release gate anti-churn. |

## Reglas DCF26

- Ninguna fase puede cerrarse si solo deja contratos o documentos.
- Toda fase de runtime debe exponer frontend, importaciones, pantalla o accion visible, endpoint/servicio, prueba y evidencia.
- No crear una segunda landing, parametrizacion, app, API, dashboard, plan de pagos o modulo paralelo.
- No usar datos reales en seeds, capturas, pruebas o archivos de tienda.
- No prometer cumplimiento legal, tributario, laboral o aprobacion de entidades sin evidencia y revision profesional.
- RDEP no se considera listo sin validacion XSD automatizada y fuente/ficha vigente documentada.
- Bancos no se consideran listos si la configuracion OWNER no alimenta el generador real.
- API externa no se considera lista sin versionado, auth, scopes, rate limit, idempotencia y auditoria.
- Cada fase requiere AuditLock firmado y commit `phase: DCF26-XX task: ...`.

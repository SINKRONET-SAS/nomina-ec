# DCF26-12 - QA, limpieza y release anti-churn

## Estado

Completado localmente en segunda pasada runtime.

## Cambios cerrados

| Linea | Resultado |
|-------|-----------|
| Reversa de carga masiva | Se agrego listado de lotes recientes y reversa segura de lote en UI/API. La reversa se bloquea si existen nominas, marcaciones, novedades, equipos o beneficios asociados. |
| Codigo/documentos muertos | Se archivaron 39 `docs2/Qwen_python_*.py` en `docs2/archive/qwen-python-20260616/` con README de no reuso operacional. |
| Plan y matriz | `PLAN_HAIKY_DIAGNOSTICO_CIERRE_FUNCIONAL_NOMINA_EC_2026.md` y `MATRIZ_DCF26_HALLAZGOS.md` quedaron actualizados con fases completadas y bloqueos controlados. |
| Runbook DEMO | Se agrego `RUNBOOK_DCF26_12_E2E_DEMO.md` con flujo reproducible y evidencia esperada. |
| AuditLock | Se actualiza como cierre final DCF26-12. |

## Archivos funcionales modificados

- `backend/src/services/employeeImportService.js`
- `backend/src/controllers/empleadoController.js`
- `backend/src/app.js`
- `backend/src/services/employeeImportService.test.js`
- `frontend-web/src/pages/Empleados/ListaEmpleados.jsx`

## Gates ejecutados

| Gate | Resultado | Evidencia |
|------|-----------|-----------|
| Backend tests | PASS | `npm.cmd test -- --runInBand`: 17 suites, 60 tests, 4.472 s. |
| Test focal carga masiva | PASS | `npm.cmd test -- employeeImportService.test.js --runInBand`: 8 tests. |
| Node check backend | PASS | `node --check` en `employeeImportService.js`, `empleadoController.js` y `app.js`. |
| Frontend build/PWA | PASS | `npm.cmd run build` en `frontend-web`. |
| Prisma schema | PASS | `npx.cmd prisma validate` en `backend`. |
| Store readiness movil | PASS | `npm.cmd run check:stores` en `app-movil`. |
| Mobile JSX parse | PASS | `MOBILE_JSX_PARSE_OK`. |
| ATS fuera de nomina | PASS | `rg reportes/ats|generarATS|generarXML_ATS|sriAtsGenerator` sin coincidencias en runtime. |
| Popups nativos web | PASS | `rg "alert\\(|confirm\\(|window\\.open" frontend-web/src` sin coincidencias. |
| Qwen raiz docs2 | PASS | `Get-ChildItem docs2 -Filter "Qwen_python_*.py"` devuelve 0. |
| Diff check | PASS | `git diff --check` sin errores; solo avisos CRLF esperados. |
| Smoke visual | SKIPPED_TOOL_UNAVAILABLE | El controlador del navegador integrado no estuvo disponible. |

## Cierre de pendientes delegados

| Pendiente previo | Cierre aplicado |
|------------------|----------------|
| Rollback de carga masiva | Cerrado con `DELETE /api/empleados/importar/lotes/:batchId`, lista de lotes y boton visible en Empleados. |
| Qwen_python en docs2 | Cerrado por archivado con indice y regla de no reuso. |
| Plan DCF26 figuraba pendiente | Cerrado: fases DCF26-00..12 marcadas como completadas localmente. |
| QA lento | Cerrado localmente: suite final bajo 5 s en esta ejecucion. |
| Smoke visual sin navegador | No cerrado por herramienta; queda como bloqueo local repetible mediante runbook. |

## Bloqueos residuales honestos

- Validacion legal, tributaria y laboral profesional antes de produccion.
- Cuentas reales de tiendas, EAS, certificados y URLs productivas.
- Rate limit compartido de API v1 en despliegues multi-instancia.
- Sustituir resolucion movil por `email_personal` con relacion formal usuario-empleado migrada.
- Ejecutar smoke visual con navegador disponible y guardar capturas.

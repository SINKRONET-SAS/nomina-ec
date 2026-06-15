# Plan HAIKY-CIERRE-BRECHAS-NOMINA-EC-DIAGNOSTICO-2026

Codigo: CBN26
Estado: CBN26-01..10 ejecutadas localmente con riesgos residuales documentados
Fecha: 2026-06-14
Repositorio objetivo: nuevo_nomina
Fuente de requerimiento: diagnostico del usuario sobre bugs criticos, funcionalidad decorativa y problemas de arquitectura
Fuente de reglas: RULES.md
Lock de gobierno: .vscode/AuditLock.json
Prompts de ejecucion: .github/prompts/CIERRE-BRECHAS-NOMINA-EC-2026-*.md

## Objetivo

Convertir los hallazgos del diagnostico en un plan HAIKY ejecutable para cerrar brechas reales de nomina, PDF, beneficios, marcaciones, multi-tenant, planes, parametros legales y rendimiento.

Este plan no corrige runtime en el baseline. Su funcion es ordenar el trabajo para que cada fix tenga aprobacion, alcance claro, validacion, rollback y evidencia. Las fases funcionales solo pueden iniciarse con aprobacion explicita del prompt correspondiente.

## Diagnostico de partida

| ID | Severidad | Hallazgo | Riesgo operativo | Respuesta CBN26 |
| --- | --- | --- | --- | --- |
| CBN-B01 | P0 | `generarRolPagos.js` envia `Blob` crudo a `UploadFile`, pero la integracion espera base64. | Rol de pagos PDF no se guarda o queda corrupto. | Fase CBN26-01 corrige contrato de carga PDF y evidencia de archivo. |
| CBN-B02 | P0 | Fetch PDF desde frontend usa `base44.auth.getToken?.()` inexistente. | Boton PDF falla silenciosamente o queda sin autorizacion. | Fase CBN26-01 elimina dependencia Base44 inexistente y usa auth real del stack. |
| CBN-B03 | P0 | `Nomina.jsx` usa fetch directo con token inexistente para PDF. | Descarga/generacion de roles falla sin error visible. | Fase CBN26-02 integra cliente API, errores visibles y estados UI. |
| CBN-B04 | P1 | `Beneficios.jsx` no permite edicion real. | Anticipos/prestamos no pueden corregirse operativamente. | Fase CBN26-03 implementa CRUD completo gobernado. |
| CBN-B05 | P0 | Prestamos/anticipos existen en entidad pero no se descuentan automaticamente en nomina. | Neto de nomina incorrecto y riesgo contable. | Fases CBN26-03 y CBN26-05 conectan beneficios con deducciones. |
| CBN-B06 | P1 | `Marcaciones.jsx` comparte `empleadoFiltro` entre registro y filtro de historial. | Registrar para empleado X filtra historial accidentalmente. | Fase CBN26-04 separa estados y cubre regresion UI. |
| CBN-B07 | P0 | `calcularNomina` en `Nomina.jsx` no incluye anticipos/prestamos. | Roles y totales de pago quedan sobrestimados. | Fase CBN26-05 centraliza deducciones y conciliacion. |
| CBN-B08 | P1 | `Empresas.jsx` es decorativo; `empresa_id` en empleados toma solo `empresas[0]`. | Multi-tenant aparente, datos cruzados o tenant incorrecto. | Fase CBN26-06 implementa tenant activo y seleccion segura. |
| CBN-B09 | P1 | `Planes.jsx` gestiona planes sin restringir funcionalidades. | Monetizacion y limites comerciales no se aplican. | Fase CBN26-07 crea matriz de capacidades y enforcement. |
| CBN-B10 | P0 | `ParametrosLegales.jsx` edita modal, pero nomina usa `PARAMETROS_2026` hardcodeado como fallback primario. | Parametros legales UI no afectan calculo real. | Fase CBN26-08 elimina fallback primario hardcodeado y usa parametros versionados. |
| CBN-B11 | P2 | Dashboard carga 500 marcaciones para contar las de hoy. | Lentitud y costo de datos innecesario. | Fase CBN26-09 agrega consulta agregada/filtrada. |
| CBN-B12 | P2 | `verificarMarcacionesFaltantes` carga 1000 marcaciones en memoria sin filtrar por fecha. | Escalabilidad pobre y riesgo de timeout. | Fase CBN26-09 filtra por fecha en origen. |

## Principios de ejecucion

- No iniciar una fase funcional sin aprobacion explicita del prompt correspondiente.
- No adelantar fixes de fases posteriores.
- No ocultar errores: todo fallo de PDF, API, permisos o calculo debe mostrar error estructurado y mensaje visible.
- No mantener tokens Base44 ni SDK inexistente como dependencia si el runtime real usa otro mecanismo de auth.
- No calcular nomina en frontend si el backend ya tiene motor canonico, salvo vista preliminar claramente marcada como tal.
- No descontar prestamos/anticipos sin trazabilidad, estado, periodo, idempotencia y conciliacion.
- No permitir multi-tenant decorativo: todo flujo debe respetar tenant activo y permisos.
- No activar restricciones de plan solo en UI; debe existir enforcement backend o capa compartida verificable.
- No usar parametros legales hardcodeados como fuente primaria para calculos oficiales.
- No cargar colecciones grandes para agregados simples si la API o DB puede filtrar por fecha/tenant.
- Todo archivo `.js`, `.md` y `.json` debe quedar en UTF-8 sin BOM.

## Fases

| Fase | Estado inicial | Objetivo |
| --- | --- | --- |
| CBN26-00 | completed | Baseline documental, prompts y AuditLock sin tocar runtime. |
| CBN26-01 | completed_local | Contrato PDF de roles reforzado sobre stack real sin Base44. |
| CBN26-02 | completed_local | Boton PDF en roles con cliente API, estados UI y errores visibles. |
| CBN26-03 | completed_local | Beneficios: edicion real, anticipos/prestamos y estados contables. |
| CBN26-04 | completed_by_stack_mapping | No existe `Marcaciones.jsx`/`empleadoFiltro`; bug no reproducible en stack actual. |
| CBN26-05 | completed_local | Motor de deducciones: anticipos/prestamos en calculo y cierre idempotente. |
| CBN26-06 | completed_by_stack_mapping | No existe fallback `empresas[0]`; nueva funcionalidad respeta tenant. |
| CBN26-07 | completed_local | Planes, gestion de planes y capacidades con enforcement backend. |
| CBN26-08 | completed_local_with_professional_block | Parametros legales versionados ampliados como fuente primaria. |
| CBN26-09 | completed_local | Rendimiento de marcaciones y dashboard con filtros/agregados en origen. |
| CBN26-10 | completed_local_with_residual_risks | QA end-to-end local, reportes de cierre y riesgos residuales. |

## Entregables por fase

| Fase | Entregable documental minimo | Evidencia tecnica minima |
| --- | --- | --- |
| CBN26-00 | Este plan, prompts y AuditLock actualizado. | JSON parse, UTF-8 sin BOM, `git diff --check`. |
| CBN26-01 | `docs/REPORTE_CBN26_01_PDF_UPLOAD_AUTH.md` | Test/validacion de PDF base64, auth real, error visible. |
| CBN26-02 | `docs/REPORTE_CBN26_02_NOMINA_PDF_UI.md` | Build frontend, prueba de boton PDF, estados loading/error/success. |
| CBN26-03 | `docs/REPORTE_CBN26_03_BENEFICIOS_CRUD.md` | CRUD beneficios, validaciones, trazabilidad y permisos. |
| CBN26-04 | `docs/REPORTE_CBN26_04_MARCACIONES_ESTADO.md` | Prueba de registro sin alterar filtro de historial. |
| CBN26-05 | `docs/REPORTE_CBN26_05_DEDUCCIONES_NOMINA.md` | Caso dorado con prestamo/anticipo y conciliacion de neto. |
| CBN26-06 | `docs/REPORTE_CBN26_06_MULTI_TENANT_EMPRESAS.md` | Pruebas tenant A/B y rechazo de `empresas[0]` como fallback. |
| CBN26-07 | `docs/REPORTE_CBN26_07_PLANES_CAPACIDADES.md` | Matriz de capacidades, enforcement y mensajes UI. |
| CBN26-08 | `docs/REPORTE_CBN26_08_PARAMETROS_LEGALES.md` | Parametros versionados usados por nomina, sin fallback primario hardcodeado. |
| CBN26-09 | `docs/REPORTE_CBN26_09_RENDIMIENTO_MARCACIONES.md` | Consultas filtradas/agregadas y medicion antes/despues. |
| CBN26-10 | `docs/REPORTE_CBN26_10_QA_RELEASE.md` | Backend tests, frontend build, regresion PDF/nomina/marcaciones. |

## Gates globales

- `RULES.md` leido antes de modificar runtime.
- `.vscode/AuditLock.json` valido y firmado antes de iniciar cada fase.
- UTF-8 sin BOM en archivos modificados.
- `git diff --check` sin errores.
- `node --check` para archivos JavaScript modificados.
- Tests backend cuando se toque calculo, PDF, beneficios, permisos o multi-tenant.
- Build frontend cuando se toque UI.
- Prueba de regresion del flujo afectado antes de cerrar fase.
- Reporte de fase con archivos tocados, validaciones, riesgo residual y rollback.

## Orden de ejecucion

1. Ejecutar solo el prompt de la fase aprobada.
2. Leer `RULES.md`, `AuditLock.json`, este plan y el prompt de fase.
3. Confirmar que la fase anterior esta firmada.
4. Implementar solo el alcance aprobado.
5. Ejecutar validaciones de fase.
6. Crear reporte de fase.
7. Actualizar `AuditLock.json` con `phaseCompleted`, `filesModified`, `validationChecks` y `signature`.
8. Commit esperado: `phase: CBN26-XX task: <descripcion>`.

## Riesgos residuales del baseline

- El diagnostico menciona archivos y comportamientos que deben confirmarse contra el codigo actual antes de editar.
- Puede existir divergencia entre frontend, backend y servicios heredados; cada fase debe mapear llamadas reales antes de cambiar contratos.
- Las tasas y parametros legales siguen sujetos a validacion oficial/profesional antes de uso productivo.
- Multi-tenant y planes requieren enforcement backend para no quedar solo como UI decorativa.

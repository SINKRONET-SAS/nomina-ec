
---

## Open Haiky Plan - HAIKY-CONTABILIDAD-REPORTES-NOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CONTABILIDAD-REPORTES-NOMINA-2026 |
| Codigo | CRN26 |
| Estado | CRN26-00..08 ejecutadas localmente |
| Fase actual | CRN26-08 cierre QA local |
| Alcance | esquema contable por parametro de nomina, reportes por empleado, matriz empleados x beneficios/conceptos y reportes contables de nomina |
| Requerimiento fuente | "Es necesario desplegar el esquema contable de cada uno de los parametros, consumir y desplegar los calculos de nomina en reportes tanto a nivel de un empleado como de todos los empleados con filas los empleados y columnas los beneficios, adicionalmente que se despliegue los reportes contables relativos a nomina." |
| Plan doc | `docs2/PLAN_HAIKY_CONTABILIDAD_REPORTES_NOMINA_2026.md` |
| Matriz | `docs2/contabilidad-reportes-nomina-2026/MATRIZ_CRN26_REQUERIMIENTOS.md` |
| Contrato | `docs2/contabilidad-reportes-nomina-2026/CONTRATO_CRN26_ESQUEMA_REPORTES_CONTABLES.md` |
| Runbook | `docs2/contabilidad-reportes-nomina-2026/RUNBOOK_CRN26_QA_RELEASE.md` |
| Reporte baseline | `docs2/contabilidad-reportes-nomina-2026/REPORTE_CRN26_00_BASELINE.md` |
| Reportes runtime | `docs2/contabilidad-reportes-nomina-2026/REPORTE_CRN26_01_DIAGNOSTICO_RUNTIME.md` .. `REPORTE_CRN26_08_CIERRE_QA.md` |
| Prompts | `.github/prompts/CONTABILIDAD-REPORTES-NOMINA-2026-{00..08}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Resumen CRN26

CRN26 formaliza la solucion definitiva para contabilidad y reportes de nomina. La ejecucion local agrego matriz contable unica gobernada por tenant, lineas de calculo normalizadas, consumo dinamico de novedades aprobadas, lote obligatorio por corrida de calculo, reportes por empleado, matriz empleados x beneficios/conceptos y asientos contables balanceados. La raiz del repo ahora gobierna `backend`, `frontend-web` y `app-movil` como un solo sistema mediante workspaces y `npm run contracts`.

### Cierre anti-brecha DOC26 sobre dotacion y parametrizacion

En respuesta a la preocupacion comercial de no prometer funcionalidades sin backend, se cerro una brecha del plan inicial: el acta de entrega de dotacion de ropa de trabajo y equipos ahora se genera desde el sistema. El cierre agrega el tipo documental `acta_entrega_dotacion`, migra `acta_entrega_equipos` para guardar items estructurados, fecha de entrega y enlace al documento legal, expone `POST /api/documentos/acta-entrega-dotacion`, registra el PDF en `documentos_legales`, audita la generacion y agrega la pantalla PWA `Documentos > Entrega de dotacion`.

La pantalla de parametrizacion tambien se ajusto para evitar la percepcion de doble parametrizacion: el dominio legal visible pasa a `Valores legales` y el dominio contable a `Cuentas contables de nomina`. Los valores legales alimentan calculos; las cuentas contables consumen conceptos calculados para debe/haber. El contrato raiz verifica esta separacion.

Seguimiento 2026-06-24 23:50: `Tipo de novedad` quedo protegido contra duplicados. Se agrego la migracion `20260624233500_crn26_novelty_type_unique_index`, que normaliza codigos, cierra duplicados activos por alcance y crea `novelty_type_configs_active_code_norm_idx` para impedir dos novedades activas vigentes con el mismo codigo normalizado. El backend deduplica el resumen por `LOWER(BTRIM(code))` prefiriendo el override del tenant sobre defaults globales; la PWA tambien aplica `dedupeNoveltyRecords` como defensa visual.

Seguimiento 2026-06-25 00: contrato de prueba para mercaderistas se cerro sin hardcodear clausulas en JS. Las plantillas legales revisables viven en `docs2/plantillas-legales/contratos` y las plantillas ejecutables versionadas en `backend/src/templates/legal/contracts`. El backend expone `GET /api/documentos/contrato/plantillas`, genera PDF completo desde JSON con `POST /api/documentos/contrato`, guarda `documentos_legales` con metadata de plantilla, periodo de prueba, fuente runtime, estado SUT/MDT pendiente y revision legal requerida. La PWA `Documentos > Contratos` consume el catalogo real de plantillas, permite seleccionar empleado y genera el PDF contra backend; se elimino el placeholder de PDF que remitia a HTML original.

### Fases CRN26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CRN26-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| CRN26-01 | P0 | completed_local | Diagnostico runtime de parametros, calculo, beneficios, reportes, contabilidad, PWA y permisos. |
| CRN26-02 | P0 | completed_local | Modelo de datos y conceptos contables/reportables con vigencia, RLS, indices y rollback. |
| CRN26-03 | P0 | completed_local | Backend de esquema contable: CRUD, defaults, overrides por tenant, validaciones y auditoria. |
| CRN26-04 | P0 | completed_local | Motor de nomina emite lineas de calculo normalizadas sin romper historico. |
| CRN26-05 | P0 | completed_local | Reportes de calculo: detalle por empleado y matriz empleados x beneficios/conceptos. |
| CRN26-06 | P0 | completed_local | Reportes contables: devengamiento, provisiones, pago, balance y exportacion. |
| CRN26-07 | P0 | completed_local | PWA: esquema contable, filtros, descargas, bloqueos y navegacion. |
| CRN26-08 | P0 | completed_local | QA, migraciones, rollback, pruebas, AuditLock y release gate. |

### Reglas CRN26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No reemplazar cuentas reales del tenant por defaults; los defaults son semilla auditable.
- No recalcular historicos cerrados con mappings nuevos; usar snapshots y vigencia.
- Todo reporte contable debe balancear debe/haber o fallar con error visible.
- La matriz empleados x beneficios debe conciliar con total ingresos, deducciones, provisiones, costo empleador y neto.
- La UI final debe exponer configuracion contable y reportes; no se acepta cierre solo backend.
- Commits esperados: `phase: CRN26-XX task: ...`.

### Ejecucion CRN26

- Migraciones aplicadas: `20260624223000_crn26_configurable_novelties` y `20260624224500_crn26_payroll_calculation_batches`.
- Backend: `payrollAccountingService`, `payrollNoveltyService`, recurso `payrollAccountingMappings`, lotes `payroll_calculation_batches` y reportes `PAYROLL_EMPLOYEE_DETAIL`, `PAYROLL_BENEFITS_MATRIX`, `PAYROLL_ACCOUNTING_REPORT`.
- PWA: formulario `Cuentas contables de nomina`, valores legales separados, tipos de novedad con forma de calculo e impacto, acta de entrega de dotacion/equipos, reportes internos de nomina y reporte contable sin opcion legacy visible.
- Sistema unico: `package.json` raiz con workspaces `backend`, `frontend-web`, `app-movil` y gate `scripts/verify-system-contracts.mjs`.
- Gates: `npm run contracts` PASS, `npm run prisma:validate` PASS, `npx prisma migrate deploy` PASS, `npx prisma generate` PASS, `npm run test:backend` PASS con 29 suites y 127 tests, `npm --workspace=frontend-web run build` PASS, `npm run check:mobile` PASS.

---

## Open Haiky Plan - HAIKY-AUDITORIA-INTEGRAL-V55-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V55-NOMINA-EC-2026 |
| Codigo | AIV55 |
| Estado | AIV55-00..05 ejecutadas localmente |
| Fase actual | AIV55-05 cierre QA local |
| Alcance | cierre de hallazgos V55: rendimiento nomina, fondo de reserva, novedades, app movil, landing, WhatsApp con consentimiento, auditoria y QA |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaIntegral2026V55.jsx` y `src/pages/v55/v55data.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_V55_NOMINA_EC_2026.md` |
| Matriz | `docs2/auditoria-integral-v55-nomina-ec-2026/MATRIZ_AIV55_HALLAZGOS.md` |
| Runbook | `docs2/auditoria-integral-v55-nomina-ec-2026/RUNBOOK_AIV55_QA_CIERRE.md` |
| Reporte cierre | `docs2/auditoria-integral-v55-nomina-ec-2026/REPORTE_AIV55_00_05_CIERRE_LOCAL.md` |
| Prompts | `.github/prompts/AUDITORIA-INTEGRAL-V55-NOMINA-EC-2026-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Resumen AIV55

AIV55 fue ejecutada localmente sobre `nuevo_nomina` despues de contrastar la auditoria V55 contra el estado real. Se confirmo como cierre previo que el N+1 de parametros legales y el decimo cuarto por region ya estaban resueltos. Se implemento modalidad de fondo de reserva por empleado (`mensual` / `iess_directo`), UI en ficha empleado, importacion, seed demo y detalle de calculo. Se agregaron tipos de novedad faltantes en cierre de mes, app movil con textos humanizados y navegacion de periodos, landing publica sin jerga contable innecesaria, WhatsApp bloqueado sin consentimiento explicito y auditoria principal con sanitizacion.

Segunda pasada puntual Banco Pacifico 2026-06-23:

- `PACIFICO` agregado como perfil estatico con layout `pacifico_interbank_immediate`, codigo bancario base `2013`, encoding `latin1`, line ending CRLF y columnas canonicas para transferencias interbancarias inmediatas.
- `bancoAebGenerator` entiende `layout` y deriva `tipoIdentificacion` y `tipoCuenta` para Banco Pacifico; valida columnas del archivo generado.
- Parametrizacion PWA reemplaza campos decorativos por selector de plantilla bancaria, incluyendo `Banco Pacifico - transferencias interbancarias inmediatas`.
- Seed demo registra perfil y homologacion Banco Pacifico con fuente `docs2/Formato_para_transferencias_interbancarias_inmediatas.pdf`.
- Gates: `npm.cmd test -- bancoAebGenerator.test.js --runInBand` PASS, `node --check` del generador/seed PASS, `npm.cmd run build` en frontend PASS.

Gates ejecutados:

- `npm.cmd test -- calculoNominaService.test.js communicationService.test.js --runInBand` en `backend`: PASS, 2 suites y 19 tests.
- `npx.cmd prisma validate` en `backend`: PASS.
- `npx.cmd prisma migrate deploy` en `backend`: PASS, aplico `20260623195500_aiv55_employee_reserve_whatsapp_consent`.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- `node --check` de `MarcacionScreen.js` y `AutoservicioScreen.js`: PASS.

Riesgos residuales AIV55:

- Revision laboral/contable/LOPDP profesional antes de produccion.
- Clientes existentes deben confirmar modalidad real de fondo de reserva durante migracion de datos.
- Prueba visual mobile requiere Expo Go/dispositivo.

---

## Open Haiky Plan - HAIKY-MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026 |
| Codigo | MRM26 |
| Estado | MRM26-00 desplegada documentalmente; runtime pendiente de aprobacion por fase |
| Fase actual | MRM26-00 baseline documental |
| Alcance | rutas moviles para mercaderistas: jornada diaria, multiples visitas por dia, sitios asignados/no programados, geocercas, evidencia y separacion asistencia vs ruta |
| Requerimiento fuente | "Mercaderistas visitan tiendas, pueden visitar varios sitios al dia y su marcacion requerida en la app es rotativa en los diferentes sitios a los que llega." |
| Plan doc | `docs2/PLAN_HAIKY_MERCADERISTAS_RUTAS_MOVILES_ASISTENCIA_2026.md` |
| Matriz | `docs2/mercaderistas-rutas-moviles-asistencia-2026/MATRIZ_MRM26_REQUERIMIENTOS.md` |
| Contrato | `docs2/mercaderistas-rutas-moviles-asistencia-2026/CONTRATO_MRM26_RUTAS_VISITAS_MERCADERISTAS.md` |
| Runbook | `docs2/mercaderistas-rutas-moviles-asistencia-2026/RUNBOOK_MRM26_OPERACION_MOVIL.md` |
| Reporte baseline | `docs2/mercaderistas-rutas-moviles-asistencia-2026/REPORTE_MRM26_00_BASELINE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen MRM26

MRM26 separa la asistencia laboral usada por nomina de la ruta operativa de mercaderistas. La app debe conservar inicio/fin de jornada y, dentro de esa jornada, permitir varias visitas por dia con llegada/salida por tienda, visitas no programadas, GPS, evidencia y excepciones revisables.

### Fases MRM26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| MRM26-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| MRM26-01 | P0 | pending_approval | Diagnostico runtime de asistencia movil, zonas, jornadas, periodos, app Expo, backend y reportes. |
| MRM26-02 | P0 | pending_approval | Modelo de datos para sitios, rutas, paradas, visitas, excepciones, indices, RLS y retencion. |
| MRM26-03 | P0 | pending_approval | Backend de sitios, rutas y visitas: CRUD, asignacion, validaciones, geocerca, offline y auditoria. |
| MRM26-04 | P0 | pending_approval | PWA RRHH/supervisor: sitios, rutas diarias, asignacion masiva, monitoreo y aprobacion de excepciones. |
| MRM26-05 | P0 | pending_approval | App movil: ruta de hoy, llegada/salida por tienda, visita no programada, evidencia y mensajes claros. |
| MRM26-06 | P0 | pending_approval | Reglas fail-closed: no doble visita abierta, no fin de jornada con visita abierta, periodo requerido y geocerca. |
| MRM26-07 | P1 | pending_approval | Reportes, auditoria, LOPDP, retencion, trazabilidad por empleado, sitio, unidad y periodo. |
| MRM26-08 | P0 | pending_approval | QA, migraciones, rollback, seed demo, pruebas Expo Go, evidencia y release gate. |

### Reglas MRM26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- La asistencia responde si el empleado trabajo y en que horario; la ruta responde que sitios visito y con que evidencia.
- No permitir dos visitas abiertas al mismo tiempo.
- No permitir finalizar jornada con una visita abierta.
- Visitas fuera de geocerca quedan como excepcion pendiente, no como exito silencioso.
- Visitas no programadas requieren motivo y politica de aprobacion.
- Cada ruta y visita debe tener tenant, empleado, fecha y periodo operacional.
- GPS, foto y QR son evidencia sensible; aplicar minimizacion, retencion y finalidad LOPDP.
- La UI final no debe mostrar nombres Haiky, codigos internos ni lenguaje tecnico innecesario.
- Commits esperados: `phase: MRM26-XX task: ...`.

---

## Open Haiky Plan - HAIKY-CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026 |
| Codigo | CRS26 |
| Estado | CRS26-00..07 ejecutadas localmente |
| Fase actual | CRS26-07 cerrada localmente |
| Alcance | crear cargos/puestos con rango salarial, vigencia y consumo de estructura organizativa; asignar empleados a cargos desde catalogo real |
| Requerimiento fuente | "Se requiere crear cargos con un rango salarial y que consuman la estructura organizativa; el empleado debe ser asignado a un cargo o puesto llamando a la tabla de cargos." |
| Plan doc | `docs2/PLAN_HAIKY_CARGOS_RANGOS_SALARIALES_ESTRUCTURA_2026.md` |
| Matriz | `docs2/cargos-rangos-salariales-estructura-2026/MATRIZ_CRS26_REQUERIMIENTOS.md` |
| Contrato | `docs2/cargos-rangos-salariales-estructura-2026/CONTRATO_CRS26_CARGOS_RANGOS_SALARIALES.md` |
| Reporte baseline | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_00_BASELINE.md` |
| Reporte diagnostico | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_01_DIAGNOSTICO_RUNTIME.md` |
| Reporte modelo | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_02_MODELO_DATOS.md` |
| Reporte backend | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_03_BACKEND_CRUD.md` |
| Reporte frontend | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_04_FRONTEND_PARAMETRIZACION.md` |
| Reporte empleados | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_05_EMPLEADOS_IMPORTACION.md` |
| Reporte consumidores | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_06_NOMINA_REPORTES_NOVEDADES.md` |
| Reporte cierre | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_07_CIERRE_QA.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026-{00..07}-*.md` |
| RULES | `RULES.md` |

### Resumen CRS26

CRS26 convierte `empleados.cargo` de texto libre en una entidad gobernada por tenant que consume `organization_units`, define rango salarial minimo/maximo, vigencia, estado y reglas de eliminacion por consumo. El empleado debe asignarse a un cargo desde tabla real en alta, edicion e importacion, con validacion de sueldo contra rango y continuidad historica para nominas/reportes/documentos existentes.

### Fases CRS26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CRS26-00 | P0 | completed_documental | Baseline, matriz, contrato, prompts, contexto y AuditLock sin runtime. |
| CRS26-01 | P0 | completed_local | Diagnostico runtime de usos de cargo/position en empleados, importacion, nomina, novedades, reportes y documentos. |
| CRS26-02 | P0 | completed_local | Modelo de datos, migracion, indices, relacion con estructura organizativa, vigencia e historial. |
| CRS26-03 | P0 | completed_local | Backend CRUD de cargos, validaciones de rango, bloqueos de eliminacion y auditoria. |
| CRS26-04 | P0 | completed_local | Frontend parametrizacion: cargos y puestos con crear, editar, inactivar y eliminar si no hay consumos. |
| CRS26-05 | P0 | completed_local | Empleados e importacion consumen tabla de cargos; sueldo validado contra rango. |
| CRS26-06 | P1 | completed_local | Nomina, novedades, reportes y documentos consumen cargo real con compatibilidad historica. |
| CRS26-07 | P0 | completed_local | QA, migraciones, rollback, evidencia y release gate. |

### Reglas CRS26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No crear otro catalogo decorativo: cargos debe integrarse con empleados, importacion, nomina, novedades y reportes.
- No permitir nuevos empleados con cargo escrito manualmente despues de CRS26-05.
- No eliminar cargos con consumos; inactivar cuando exista historico.
- Validar sueldo contra rango salarial del cargo y registrar excepciones solo si CRS26-02 lo aprueba.
- Commits esperados: `phase: CRS26-XX task: ...`.

### Diagnostico CRS26-01

Se verifico que `empleados.cargo` es texto libre, `NuevoEmpleado.jsx` permite cargo manual, `employeeImportService` usa `position`/`cargo` como string, `monthlyPeriodService` filtra novedades por `cargo = $2` y `payrollReportService` filtra/exporta `e.cargo`. La estrategia runtime aprobada es crear `job_positions`, agregar `empleados.position_id`, mantener `empleados.cargo` como snapshot historico y migrar consumidores gradualmente.

### Ejecucion CRS26-02

Se agrego `job_positions`, `empleados.position_id`, relaciones Prisma con `Tenant`, `OrganizationUnit` y `Employee`, constraints de rango salarial, indices, RLS y backfill local. `npx.cmd prisma validate` y `npx.cmd prisma migrate deploy` pasaron. La demo local quedo con 12 cargos migrados y 30 empleados vinculados.

### Ejecucion CRS26-03

Se expuso `jobPositions` en `configurationService` como recurso CRUD tenant-aware. El backend valida unidad organizativa activa, codigo unico por empresa, estado permitido, vigencia y rango salarial. La eliminacion queda bloqueada si existen empleados, nominas, documentos legales o lotes de novedades vinculados al cargo. `npm.cmd test -- configurationService.test.js` paso con 6/6 tests.

### Ejecucion CRS26-04

La pantalla PWA de parametrizacion incorpora `Cargo o puesto`, ligado a unidades organizativas reales y al recurso `jobPositions`. Permite crear, editar, inactivar, archivar y solicitar eliminacion condicionada por consumos. El build de frontend genero `dist/` y reporto exito; el proceso quedo vivo tras imprimir `built in 2m 31s` y fue cerrado manualmente.

### Ejecucion CRS26-05

Alta, edicion e importacion de empleados consumen `job_positions` mediante `position_id`. El backend valida cargo activo, unidad organizativa y sueldo dentro de rango; `empleados.cargo` queda como snapshot historico. La PWA reemplaza cargo manual por selector real y muestra rango salarial. Pasaron `npm.cmd test -- empleadoController.test.js employeeImportService.test.js` y `npm.cmd run build` en frontend.

### Ejecucion CRS26-06

Novedades por cargo, reportes de nomina y listado de nominas usan `job_positions` cuando existe `position_id`, con fallback a `empleados.cargo` para historicos. El filtro por cargo acepta id, codigo, nombre o snapshot. Los reportes tabulares exportan `Codigo cargo`. Pasaron `npm.cmd test -- monthlyPeriodService.test.js payrollReportService.test.js` y `node --check backend/src/controllers/nominaController.js`.

### Ejecucion CRS26-07

CRS26 quedo cerrado localmente. Gates finales: `npx.cmd prisma validate` PASS, `npx.cmd prisma migrate deploy` PASS sin pendientes, `npm.cmd test -- --runInBand` PASS con 28 suites y 114 tests, `npm.cmd run build` en frontend PASS con PWA generada, smoke DB local confirmo 12 cargos y 30 empleados vinculados.

---

## Open Haiky Plan - HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026 |
| Codigo | DCEN26 |
| Estado | DCEN26-00..08 ejecutadas localmente |
| Fase actual | DCEN26-08 cerrada localmente |
| Alcance | empresa demo comercial totalmente configurada con 4 usuarios, 30 empleados ficticios, estructura Quito/Guayaquil, zonas, asistencias de un mes, smoke data y cierre de nomina de 5 meses 2026 |
| Plan doc | `docs2/PLAN_HAIKY_DEMO_COMERCIAL_EMPRESA_NOMINA_EC_2026.md` |
| Matriz | `docs2/demo-comercial-empresa-nomina-ec-2026/MATRIZ_DCEN26_REQUERIMIENTOS.md` |
| Runbook | `docs2/demo-comercial-empresa-nomina-ec-2026/RUNBOOK_DCEN26_DEMO_COMERCIAL.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen DCEN26

DCEN26 convierte el requerimiento de empresa demo comercial en una linea Haiky ejecutable. La demo debe quedar aislada por tenant, marcada como demo, idempotente, reversible y sin datos reales. Incluye usuarios, empleados completos, parametros legales/operativos, bancos ficticios, homologacion, estructura Quito/Guayaquil, zonas con coordenadas publicas/ficticias, asistencia de un mes y cinco cierres de nomina 2026.

Regla operativa: DCEN26-00 no toca runtime. DCEN26-01 debe diagnosticar modelos, seeds, rutas, pantallas y riesgos antes de sembrar datos. Ninguna fase posterior puede crear datos demo si no valida aislamiento tenant, idempotencia, rollback y ausencia de datos reales.

Runtime cerrado el 2026-06-22:

- Seed idempotente `backend/scripts/seed-demo-commercial.js`.
- Comandos `npm.cmd run seed:demo`, `npm.cmd run seed:demo:verify` y `npm.cmd run seed:demo:reset`.
- Demo local verificada con 1 tenant, 4 usuarios, 30 empleados, 20 cargas familiares, 6 unidades, 2 zonas, 2 jornadas, 1.284 marcaciones, 101 novedades, 5 periodos 2026 cerrados y 150 roles cerrados.
- Credenciales locales en `backend/.demo-credentials.json`, ignoradas por git.
- `BANK_ACCOUNT_ENCRYPTION_KEY` queda sin valor en `backend/.env`; el seed usa clave demo efimera en memoria si no hay clave valida.

Reejecucion local 2026-06-22:

- Evidencia: `docs2/demo-comercial-empresa-nomina-ec-2026/REPORTE_DCEN26_REEJECUCION_2026_06_22.md`.
- `npx.cmd prisma validate` en `backend`: PASS.
- `npm.cmd run seed:demo` en `backend`: PASS.
- `npm.cmd run seed:demo:verify` en `backend`: PASS.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 27 suites y 105 tests.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- Conteos confirmados: 1 tenant demo DCEN26, 4 usuarios, 30 empleados, 20 cargas familiares, 6 unidades, 2 zonas, 2 jornadas, 1.284 marcaciones, 101 novedades, 5 periodos 2026 cerrados, 150 roles cerrados y 1 perfil bancario demo.

Segunda pasada local 2026-06-22 con rutas moviles:

- Evidencia: `docs2/demo-comercial-empresa-nomina-ec-2026/REPORTE_DCEN26_SEGUNDA_PASADA_MRM26_2026_06_22.md`.
- `npx.cmd prisma migrate deploy` en `backend`: PASS, migracion `20260623023000_mrm26_route_visits` preservada y aplicada.
- `npx.cmd prisma generate` en `backend`: PASS.
- `npm.cmd run seed:demo:reset` en `backend`: PASS tras corregir el orden de limpieza de `job_positions`.
- `npm.cmd run seed:demo` en `backend`: PASS.
- `npm.cmd run seed:demo:verify` en `backend`: PASS.
- Conteos confirmados: 1 tenant demo DCEN26, 4 usuarios, 30 empleados, 20 cargas familiares, 6 unidades, 2 zonas, 2 jornadas, 3 sitios de ruta, 1 ruta diaria, 3 paradas de ruta, 1.284 marcaciones, 101 novedades, 5 periodos 2026 cerrados, 150 roles cerrados y 1 perfil bancario demo.

---

## Open Haiky Plan - HAIKY-DIAGNOSTICO-V3-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-V3-NOMINA-EC-2026 |
| Codigo | DV3N26 |
| Estado | DV3N26-00..08 ejecutadas localmente |
| Fase actual | DV3N26-08 cerrada localmente |
| Fuente diagnostico | `C:\proyectos web\sensible-easy-payroll-flow\src\docs\DIAGNOSTICO_V3_NOMINA_EC.md` |
| Scripts referencia | `C:\proyectos web\sensible-easy-payroll-flow\src\docs\scripts\12_fixes_v3.js` |
| Plan doc | `docs2/PLAN_HAIKY_DIAGNOSTICO_V3_NOMINA_EC_2026.md` |
| Matriz | `docs2/diagnostico-v3-nomina-ec-2026/MATRIZ_DV3N26_HALLAZGOS.md` |
| Runbook | `docs2/diagnostico-v3-nomina-ec-2026/RUNBOOK_DV3N26_QA_CIERRE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-V3-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen DV3N26

DV3N26 convierte el Diagnostico V3 de Nomina-Ec en un plan Haiky ejecutable. La fuente declara fixes de bancos, vacaciones Art. 69 CT, fondo de reserva Art. 196 CT, reportes, selectores de anio, importaciones muertas, nomina consolidada, contabilidad, manifest/lang y pendientes LOPDP/offline/cifrado/SUT. En el repo real todo debe verificarse contra Express/PostgreSQL/Prisma/React/Vite/Expo antes de modificar runtime.

Regla operativa: `12_fixes_v3.js` es referencia, no parche directo. DV3N26-01..08 quedaron ejecutadas localmente: bancos cerrada/pagada, vacaciones Art. 69, reporte contable, PWA offline segura, cifrado bancario AES-256-GCM y aviso SUT/MDT visible. Bloqueos externos: revision legal/contable, clave productiva BANK_ACCOUNT_ENCRYPTION_KEY y confirmacion oficial SUT/MDT.
## Open Haiky Plan - HAIKY-AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026 |
| Codigo | AIV50 |
| Estado | AIV50-00..08 ejecutadas localmente |
| Fase actual | AIV50-08 cerrada localmente |
| Alcance | cierre definitivo de hallazgos Auditoria Integral V50 en backend, legal Ecuador, mobile, PWA/frontend, deuda tecnica y eliminaciones controladas |
| Fuente de auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaIntegral2026V50.jsx` y `src/pages/v50/v50data.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_V50_NOMINA_EC_2026.md` |
| Matriz | `docs2/auditoria-integral-v50-nomina-ec-2026/MATRIZ_AIV50_HALLAZGOS.md` |
| Runbook | `docs2/auditoria-integral-v50-nomina-ec-2026/RUNBOOK_AIV50_QA_CIERRE.md` |
| Reporte cierre | `docs2/auditoria-integral-v50-nomina-ec-2026/REPORTE_AIV50_08_CIERRE_RUNTIME.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen AIV50

AIV50 quedo ejecutado localmente sobre Nomina-Ec. Se cerraron los P0 de nomina, auth, foto, parametros legales y marcacion movil; tambien se expuso el avance operativo en PWA y se verifico que `AutoservicioScreen.js` no era codigo muerto porque esta registrado en la tab `Perfil` de la app movil.

Gates ejecutados: Prisma validate, Jest backend, build/smoke PWA, check:stores, Expo doctor, diff check y UTF-8 sin BOM. La validacion profesional legal/contable/LOPDP sigue como bloqueo externo antes de produccion.

---
## Open Haiky Plan - HAIKY-COMUNICACIONES-EMAIL-SMTP-LEGAL-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-COMUNICACIONES-EMAIL-SMTP-LEGAL-2026 |
| Codigo | CES26 |
| Estado | CES26-00..06 ejecutadas localmente |
| Fase actual | CES26-06 cerrada localmente |
| Alcance | diagnostico integral y cierre operativo/legal del servicio SMTP: verificacion de correo, recuperacion de clave, empleados, proteccion de datos y evidencia LOPDP |
| Plan doc | `docs2/PLAN_HAIKY_COMUNICACIONES_EMAIL_SMTP_LEGAL_2026.md` |
| Matriz | `docs2/comunicaciones-email-smtp-legal-2026/MATRIZ_CES26_HALLAZGOS.md` |
| Runbook | `docs2/comunicaciones-email-smtp-legal-2026/RUNBOOK_CES26_SMTP_LOPDP.md` |
| Reporte | `docs2/comunicaciones-email-smtp-legal-2026/REPORTE_CES26_06_CIERRE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/COMUNICACIONES-EMAIL-SMTP-LEGAL-2026-{00..06}-*.md` |
| RULES | `RULES.md` |

### Resumen CES26

CES26 extiende CSW26 sin duplicarlo. SMTP ya estaba conectado a verificacion de correo, recuperacion de clave e invitaciones de app; el cierre actual agrega evidencia legal-operativa con `communication_events`, hash HMAC de destinatarios, retencion configurable, RLS, historial visible en PWA y runbook LOPDP. No se guardan codigos, cuerpos de correo, telefonos ni emails completos.

Runtime cerrado:

- Migracion `20260620103000_ces26_communication_events` aplicada localmente.
- `communicationAuditService` registra eventos minimizados por canal, plantilla, estado, finalidad, tenant, usuario y correlacion.
- `communicationService` audita SMTP/WhatsApp en verificacion, recuperacion, invitaciones y prueba SMTP.
- Pantalla `Comunicaciones` muestra proteccion de datos, retencion e historial reciente.
- `.env.example` y `render.yaml` incluyen `COMMUNICATION_RETENTION_DAYS` y `COMMUNICATION_EVENT_HASH_SECRET`.

Bloqueos externos:

- Configurar credenciales SMTP reales fuera del repositorio.
- Definir `COMMUNICATION_EVENT_HASH_SECRET` productivo en Render.
- Ejecutar prueba SMTP real desde PWA con correo controlado.
- Revision profesional LOPDP antes de prometer cumplimiento legal total.

---

## Open Haiky Plan - HAIKY-COMUNICACIONES-SMTP-WHATSAPP-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-COMUNICACIONES-SMTP-WHATSAPP-2026 |
| Codigo | CSW26 |
| Estado | CSW26-00..07 ejecutadas localmente |
| Fase actual | CSW26-07 cerrada localmente |
| Alcance | comunicaciones transaccionales SMTP y WhatsApp para registro, verificacion de correo, recuperacion de clave e invitaciones de app de asistencia |
| Plan doc | `docs2/PLAN_HAIKY_COMUNICACIONES_SMTP_WHATSAPP_2026.md` |
| Matriz | `docs2/comunicaciones-smtp-whatsapp-2026/MATRIZ_CSW26_HALLAZGOS.md` |
| Reporte | `docs2/comunicaciones-smtp-whatsapp-2026/REPORTE_CSW26_07_CIERRE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/COMUNICACIONES-SMTP-WHATSAPP-2026-{00..07}-*.md` |
| RULES | `RULES.md` |

### Resumen CSW26

CSW26 implemento un servicio unico de comunicaciones para Nomina-Ec. SMTP queda como canal primario para verificacion de correo y recuperacion de clave; WhatsApp Business Cloud API queda como canal complementario para activar la app movil de asistencia con plantillas aprobadas.

Runtime cerrado:

- `communicationService` con SMTP, WhatsApp, estado sin secretos y prueba SMTP.
- Registro publico e interno generan codigo de verificacion y lo envian por SMTP.
- Recuperacion de clave envia codigo por SMTP sin exponer existencia de cuentas.
- Invitaciones de empleados envian email y registran intento WhatsApp con estado por canal.
- Dashboard permite confirmar y reenviar codigo de verificacion.
- Pantalla `Comunicaciones` muestra SMTP/WhatsApp, variables faltantes, plantillas y prueba de email.

Gates ejecutados:

- `npm.cmd audit --audit-level=low` en `backend`: PASS, 0 vulnerabilidades.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 21 suites y 82 tests.
- `npm.cmd run build` y `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npx.cmd prisma validate` en `backend`: PASS.
- `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil`: PASS.

Bloqueos externos:

- Configurar credenciales SMTP reales fuera del repositorio.
- Configurar token, phone number ID, version Graph API y plantillas WhatsApp aprobadas.

---

## Open Haiky Plan - HAIKY-DIAGNOSTICO-INTEGRAL-COMERCIAL-UI-CALIDAD-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-INTEGRAL-COMERCIAL-UI-CALIDAD-2026 |
| Codigo | DIC26 |
| Estado | DIC26-00..08 ejecutadas localmente |
| Fase actual | DIC26-08 cerrada localmente |
| Alcance | diagnostico integral de diseno, UI/UX, oferta comercial visible, accesos, codigo muerto, bugs, importaciones, errores, mojibake y UTF-8 |
| Plan doc | `docs2/PLAN_HAIKY_DIAGNOSTICO_INTEGRAL_COMERCIAL_UI_CALIDAD_2026.md` |
| Matriz | `docs2/diagnostico-integral-comercial-ui-calidad-2026/MATRIZ_DIC26_HALLAZGOS.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-INTEGRAL-COMERCIAL-UI-CALIDAD-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen DIC26

DIC26 ejecuto una pasada integral de confianza comercial y calidad sobre Nomina-Ec. El foco fue que la oferta se entienda antes de contratar, que los accesos no generen friccion, que la app movil exponga la asistencia real, que no existan permisos/dependencias muertas y que el repositorio quede limpio de BOM/mojibake literal.

### Fases DIC26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| DIC26-00 | P0 | completed_documental | Baseline, reglas, contexto, candado y alcance. |
| DIC26-01 | P0 | completed_local | Diagnostico integral de rutas, pantallas, logs, imports, dependencias y encoding. |
| DIC26-02 | P0 | completed_local | Oferta comercial visible en landing y reduccion de friccion publica. |
| DIC26-03 | P0 | completed_local | Accesos web: ojo de clave en login, registro y recuperacion. |
| DIC26-04 | P0 | completed_local | App movil enfocada en asistencia: marcacion, historial y perfil visibles. |
| DIC26-05 | P1 | completed_local | Codigo muerto/dependencias/permisos: retiro de camara y navegacion movil no usada. |
| DIC26-06 | P0 | completed_local | UTF-8 sin BOM y cero mojibake literal en archivos auditados. |
| DIC26-07 | P0 | completed_local | QA, evidencia, AuditLock, commit y push. |
| DIC26-08 | P0 | completed_local | Residuales cerrados: Vite chunk y Dependabot/npm audit. |

### Ejecucion DIC26 2026-06-19

Runtime cerrado:

- Landing publica con bloque de oferta comercial visible: prueba, PYME y corporativo.
- Login, registro y recuperacion web con mostrar/ocultar contrasena.
- App movil con tabs simples para marcar asistencia, revisar historial y ver perfil.
- Retirados `expo-camera`, permisos de camara y dependencias de navegacion no usadas.
- Limpieza global de BOM y mojibake literal en archivos auditados.
- Cierre posterior de warning Vite chunk mayor a 500 kB y vulnerabilidades Dependabot/npm audit en web, backend y movil.

Gates esperados:

- `npm.cmd run build` en `frontend-web`.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil`.
- Gate Node UTF-8/BOM/mojibake.
- `npm.cmd audit --audit-level=low` en `frontend-web`, `backend` y `app-movil`.

---

## Open Haiky Plan - HAIKY-EMPLEADOS-APP-ASISTENCIA-INVITACION-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-EMPLEADOS-APP-ASISTENCIA-INVITACION-2026 |
| Codigo | EAA26 |
| Estado | EAA26-01..08 ejecutadas localmente |
| Fase actual | EAA26-08 cerrada localmente |
| Alcance | invitacion, activacion y uso de app movil por empleados de una empresa para registrar asistencia |
| Referencia funcional | `C:\proyectos web\sinkroniq-mobile` |
| Plan doc | `docs2/PLAN_HAIKY_EMPLEADOS_APP_ASISTENCIA_INVITACION_2026.md` |
| Matriz | `docs2/empleados-app-asistencia-invitacion-2026/MATRIZ_EAA26_REQUERIMIENTOS.md` |
| Contrato | `docs2/empleados-app-asistencia-invitacion-2026/CONTRATO_EAA26_FLUJO_INVITACION_EMPLEADO.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/EMPLEADOS-APP-ASISTENCIA-INVITACION-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen EAA26

EAA26 adapta el patron de referidos/invitaciones de `sinkroniq-mobile` a un flujo laboral de Nomina-Ec. El empleado no se registra como empresa ni como owner: activa su acceso movil contra una ficha `Empleado` ya creada por el tenant y queda habilitado para registrar asistencia solo si su configuracion laboral esta completa.

La referencia usada no se copia literalmente. Se toman patrones de codigo unico, hash, expiracion, reenvio, revocacion, deep link, privacidad y estados; se traducen a Express/PostgreSQL/Prisma/React/Expo del repo actual.

### Fases EAA26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| EAA26-00 | P0 | completed_documental | Baseline, plan, matriz, prompts, contexto y AuditLock sin runtime. |
| EAA26-01 | P0 | completed_local | Auditoria comparativa: referidos/invitaciones de sinkroniq-mobile vs Nomina-Ec. |
| EAA26-02 | P0 | completed_local | Modelo de datos: invitaciones de empleado, codigos hash, expiracion, estados e indices. |
| EAA26-03 | P0 | completed_local | Backend: crear, reenviar, revocar, aceptar y auditar invitaciones. |
| EAA26-04 | P0 | completed_local | Frontend OWNER/RRHH: panel de invitaciones, QR/link, estado y bloqueos. |
| EAA26-05 | P0 | completed_local | App movil: activacion de empleado, ojo de clave, privacidad y enlace laboral. |
| EAA26-06 | P0 | completed_local | Asistencia: readiness de unidad, zona, jornada, periodo y marcacion fail-closed. |
| EAA26-07 | P1 | completed_by_contract | Notificaciones, deep links y soporte quedan contratados; operacion inicial por codigo/link manual. |
| EAA26-08 | P0 | completed_local | QA, migraciones, rollback, evidencia y release gate Expo Go/build. |

### Reglas EAA26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No copiar codigo GrowPartner/staff invite literalmente; traducir el patron al dominio laboral de Nomina-Ec.
- La fuente de verdad es `Empleado` + tenant; la app no puede autoasignar empresa.
- No habilitar marcaciones si falta unidad organizativa, zona de marcacion, jornada o periodo operacional.
- Cada unidad organizativa con asistencia debe tener zona de marcacion vigente o herencia explicita.
- Invitaciones deben usar hash, expiracion, estado, auditoria, anti-enumeracion y consentimiento LOPDP.
- Commits esperados: `phase: EAA26-XX task: ...`.

### Ejecucion EAA26 2026-06-18

Runtime cerrado:

- Invitaciones de empleado con hash, expiracion, estados, reenvio, revocacion y aceptacion publica anti-enumeracion.
- Vinculo `Usuario` + `Empleado` + tenant para que la app movil no cree empresas ni owners.
- Panel RRHH visible en `ListaEmpleados` para emitir, reenviar y revocar accesos de asistencia.
- App Expo Go con activacion de empleado, ojo de clave, consentimientos LOPDP y login/recuperacion.
- Marcacion movil bloqueada si falta unidad organizativa, zona de marcacion, jornada, horas mensuales o periodo operacional abierto.
- Marcaciones guardan periodo, fecha operacional Ecuador, zona, unidad, jornada, precision GPS, origen y correlacion.

Gates ejecutados:

- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS.
- `npx.cmd prisma generate`: PASS.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 20 suites y 78 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil`: PASS.

Pendiente externo:

- Probar Expo Go en telefono contra backend LAN y definir canal real de envio de codigo/link.

---

## Open Haiky Plan - HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026 |
| Codigo | DVN26 |
| Estado | DVN26-01..09 ejecutadas localmente; E-01 IESS validado con fuente oficial |
| Fase actual | DVN26-09 cerrada localmente |
| Alcance | responder a 31 hallazgos del Diagnostico V2: calculos legales, procesos ocultos, pantallas decorativas, reportes, bancos, landing, PWA, mobile, multi-tenant y planes |
| Fuente de requerimiento | `C:\proyectos web\sensible-easy-payroll-flow\src\docs\DIAGNOSTICO_V2_NOMINA_EC.md` |
| Scripts referencia | `07_fix_nomina_calculos.js`, `08_backend_acta_finiquito_contrato.js`, `09_backend_contrato_trabajo.js`, `10_pwa_landing.js`, `11_fix_multitenant_reportes_planes.js` |
| Plan doc | `docs2/PLAN_HAIKY_DIAGNOSTICO_V2_NOMINA_EC_2026.md` |
| Matriz | `docs2/diagnostico-v2-nomina-ec-2026/MATRIZ_DVN26_HALLAZGOS.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-V2-NOMINA-EC-2026-{00..09}-*.md` |
| RULES | `RULES.md` |

### Resumen DVN26

DVN26 convierte el Diagnostico V2 en un plan Haiky ejecutable sobre el stack real de Nomina-Ec. Los scripts adjuntos provienen del prototipo Base44/Deno y se usan como referencia funcional, no como parches directos. La ejecucion debe verificar cada hallazgo contra codigo real antes de modificar runtime.

### Fases DVN26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| DVN26-00 | P0 | completed_documental | Baseline, matriz, prompts, contexto y AuditLock sin runtime. |
| DVN26-01 | P0 | completed_local_iess_validated | Parametros legales, IESS 9.45/11.15, gastos personales y tabla IR editable. |
| DVN26-02 | P0 | completed_local | Motor unico de nomina: dias, fondo reserva, bonos, cerradas y errores por empleado. |
| DVN26-03 | P0 | completed_by_stack_verification | Liquidacion, acta de finiquito, contrato PDF y DocumentoLegal. |
| DVN26-04 | P1 | completed_local | Beneficios, cuotas y cierre idempotente. |
| DVN26-05 | P1 | completed_local | Procesos backend visibles: crons, auditoria, equipos y documentos. |
| DVN26-06 | P1 | completed_local | Bancos y reportes exportables Excel/PDF/CSV por persona y estructura. |
| DVN26-07 | P0 | completed_by_stack_verification | Multi-tenant real, filtros obligatorios y planes fail-closed. |
| DVN26-08 | P1 | completed_local | Landing, PWA y app movil enfocada en asistencia. |
| DVN26-09 | P0 | completed_local | QA, rollback, evidencia y release gate. |

### Reglas DVN26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No aplicar scripts Base44 literalmente; traducir a Express/PostgreSQL/React/Expo.
- E-01 IESS queda validado con fuente oficial IESS: afiliado 9.45% y empleador 11.15%.
- Toda mejora backend que afecte operacion debe quedar visible en frontend o mostrar bloqueo claro.
- Commits esperados: `phase: DVN26-XX task: ...`.

### Ejecucion DVN26 2026-06-18

Runtime cerrado:

- Novedades con `period_id`, `periodo_nomina` y `monto`.
- `bono_desempeno` entra al motor de nomina como ingreso auditable.
- Cierre de beneficios idempotente por periodo.
- Reportes de nomina exportan XLSX/PDF/CSV por persona y estructura.
- Landing/PWA sin mensajes de demo/ficticio y con assets PNG 192/512.
- Migracion `20260618133000_dvn26_bonus_novelty_amount` aplicada en PostgreSQL local.

Gates ejecutados:

- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS.
- `npx.cmd prisma generate`: PASS.
- `npm.cmd test -- --runInBand`: PASS, 19 suites, 74 tests.
- `npm.cmd run smoke:pwa`: PASS.
- `npm.cmd run doctor` en `app-movil`: PASS, 21/21.
- `npm.cmd run check:stores` en `app-movil`: PASS.

Bloqueo residual controlado:

- IESS 9.45% personal y 11.15% patronal queda cerrado con pagina oficial IESS `Servicios y prestaciones`.

---

## Open Haiky Plan - HAIKY-CIERRE-BRECHAS-NOMINA-EC-DIAGNOSTICO-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-BRECHAS-NOMINA-EC-DIAGNOSTICO-2026 |
| Codigo | CBN26 |
| Estado | CBN26-01..10 ejecutadas localmente con riesgos residuales documentados |
| Fase actual | CBN26-10 cerrada localmente |
| Alcance | cerrar bugs criticos y brechas reales detectadas en PDF, nomina, beneficios, marcaciones, multi-tenant, planes, parametros legales y rendimiento |
| Fuente de requerimiento | Diagnostico del usuario sobre hallazgos principales |
| Plan doc | `docs/PLAN_HAIKY_CIERRE_BRECHAS_NOMINA_EC_DIAGNOSTICO_2026.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/CIERRE-BRECHAS-NOMINA-EC-2026-{00..10}-*.md` |
| RULES | `RULES.md` |

### Resumen CBN26

CBN26 transforma el diagnostico de bugs criticos en una linea HAIKY ejecutable. El objetivo no es maquillar pantallas, sino cerrar fallos que impiden que Nomina-Ec opere como sistema real: generacion de roles PDF, auth inexistente de Base44, beneficios sin edicion ni wiring contable, marcaciones con estado compartido, deducciones omitidas, empresas multi-tenant decorativas, planes sin enforcement, parametros legales ignorados por el calculo y consultas ineficientes de marcaciones.

CBN26-01..10 quedaron ejecutadas sobre el stack real. Donde el diagnostico mencionaba archivos Base44 inexistentes, se mapeo al equivalente real de Nomina-Ec. La gestion de planes toma como referencia `SINKRONET-SAS/sinkroniq-mobile`: autoridad backend, capacidades explicitas, fail-closed y pruebas.

### Fases CBN26

| Fase | Estado | Resumen |
|------|--------|---------|
| CBN26-00 | completed | Baseline documental, plan, prompts, contexto y AuditLock sin tocar runtime. |
| CBN26-01 | completed_local | Contrato PDF reforzado sin Base44/UploadFile en runtime real. |
| CBN26-02 | completed_local | Boton PDF con cliente API, estados UI y cero fallos silenciosos. |
| CBN26-03 | completed_local | Beneficios CRUD real para prestamos y anticipos. |
| CBN26-04 | completed_by_stack_mapping | `Marcaciones.jsx`/`empleadoFiltro` no existen en stack actual. |
| CBN26-05 | completed_local | Deducciones automaticas de anticipos/prestamos en nomina con conciliacion. |
| CBN26-06 | completed_by_stack_mapping | Multi-tenant sin fallback `empresas[0]`; nueva tabla respeta tenant. |
| CBN26-07 | completed_local | Gestion de planes y capacidades con enforcement backend. |
| CBN26-08 | completed_local_with_professional_block | Parametros legales versionados como fuente primaria del calculo. |
| CBN26-09 | completed_local | Rendimiento: dashboard y marcaciones faltantes con filtros/agregados en origen. |
| CBN26-10 | completed_local_with_residual_risks | QA, regresion y release local de cierre de brechas. |

### Reglas CBN26

- No iniciar una fase funcional sin aprobacion explicita del prompt correspondiente.
- No adelantar fixes de fases posteriores.
- No mantener tokens Base44 ni SDK inexistente si el runtime real usa otro mecanismo de auth.
- No dejar errores de PDF, nomina, beneficios o permisos como fallos silenciosos.
- No descontar prestamos/anticipos sin trazabilidad, periodo, idempotencia y conciliacion.
- No aceptar multi-tenant o planes solo decorativos.
- No usar parametros legales hardcodeados como fuente primaria para calculos oficiales.
- No cargar colecciones grandes para agregados simples si la API o DB puede filtrar por fecha/tenant.
- Commits esperados: `phase: CBN26-XX task: ...`.

---

## Open Haiky Plan - HAIKY-LANDING-PWA-APP-STORE-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-LANDING-PWA-APP-STORE-NOMINA-EC-2026 |
| Codigo | LPA26 |
| Estado | ejecutado localmente con bloqueos externos documentados |
| Fase actual | LPA26-08 cerrada documentalmente |
| Alcance | mejora anti-churn de landing publica, PWA y app movil para interes comercial, readiness Google Play / Apple App Store y cumplimiento LOPDP Ecuador |
| Referencia UX/release | `C:\proyectos web\sinkroniq-mobile` |
| Plan doc | `docs2/PLAN_HAIKY_LANDING_PWA_APP_STORE_NOMINA_EC_2026.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/LANDING-PWA-APP-STORE-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

### Resumen LPA26

LPA26 abre una linea de mejora comercial y release para Nomina-Ec sin churn. El plan exige diagnostico antes de tocar runtime, una sola landing, una sola PWA, una sola app movil, assets versionados, politicas legales unificadas y gates de privacidad antes de publicacion. Usa `sinkroniq-mobile` como referencia de patrones de lanzamiento, assets, smoke PWA, LOPDP y tiendas; no copia su dominio de facturacion electronica.

La base legal principal revisada es la Ley Organica de Proteccion de Datos Personales de Ecuador publicada en Registro Oficial Quinto Suplemento No. 459 del 2021-05-26, PDF oficial MINTEL: `https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf`.

### Fases LPA26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| LPA26-00 | P0 | completed | Baseline documental: plan, prompts, contexto y AuditLock; no toca runtime. |
| LPA26-01 | P0 | completed | Diagnostico anti-churn de landing, PWA, app, assets, rutas y contratos actuales. |
| LPA26-02 | P0 | completed | Landing de conversion para interes comercial en nomina Ecuador. |
| LPA26-03 | P0 | completed | PWA instalable, segura y sin cache de datos personales. |
| LPA26-04 | P0 | completed with external blockers | App movil lista para Google Play y Apple App Store, con bloqueos externos documentados. |
| LPA26-05 | P0 | completed | LOPDP: privacidad, consentimientos, retiro, incidentes, procesadores y retencion. |
| LPA26-06 | P1 | completed | Registro, activacion y onboarding comercial del OWNER. |
| LPA26-07 | P1 | completed | QA visual, performance, accesibilidad y confianza. |
| LPA26-08 | P0 | completed with external blockers | Release stores, TestFlight/internal testing, go-live, rollback y monitoreo. |

### Reglas LPA26

- No tocar runtime antes de ejecutar `LPA26-01`.
- No crear landing, app, catalogos o politicas paralelas.
- No copiar textos ni flujos de facturacion electronica de `sinkroniq-mobile`.
- No usar datos reales de empleados en demos, screenshots o assets de tienda.
- No activar analitica sin consentimiento.
- No cachear datos personales de nomina en service worker o almacenamiento local.
- No prometer cumplimiento legal total ni aprobacion de entidades sin evidencia.
- Cada fase requiere aprobacion explicita por prompt y AuditLock firmado.
- Commits esperados: `phase: LPA26-XX task: ...`.

---

## Open Haiky Plan - HAIKY-HOMOLOGACION-NOMINA-BASE44-ECUADOR-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-HOMOLOGACION-NOMINA-BASE44-ECUADOR-2026 |
| Codigo | HNBE26 |
| Estado | fases HNBE26-01..09 ejecutadas con hardening focalizado |
| Fase actual | HNBE26-09 cerrada |
| Alcance | homologacion de nomina ecuatoriana desde prototipo Base44: cumplimiento legal, parametros, beneficios, asistencia, app, planes, perfiles y reporteria |
| Repo objetivo | SINKRONET-SAS/nomina-ec |
| Fuente funcional | `C:\proyectos web\sensible-easy-payroll-flow` |
| Plan doc | `docs2/homologacion-nomina-base44-ecuador-2026/PLAN_HAIKY_HOMOLOGACION_NOMINA_BASE44_ECUADOR_2026.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/HOMOLOGACION-NOMINA-BASE44-ECUADOR-2026-{00..09}-*.md` |
| RULES | `RULES.md` |

### Resumen HNBE26

Plan para homologar un modulo laboral y de nomina en Nomina-Ec usando como referencia funcional el prototipo Base44 `sensible-easy-payroll-flow`. El plan no copia su arquitectura; traduce sus dominios de Empresa, Empleado, Marcacion, NovedadAsistencia, Nomina, BeneficioEmpleado, DocumentoLegal, ParametroLegal y PlanSuscripcion al modelo real de Nomina-Ec: `Workspace`, `Empresa`, roles, permisos, planes, mobile, PWA, auditoria y reglas Haiky.

La ejecucion HNBE26-01..09 quedo documentada en `docs2/homologacion-nomina-base44-ecuador-2026`. Base44 queda como fuente funcional/UX, no como fuente normativa: los parametros laborales Ecuador deben verificarse con fuentes oficiales y aprobacion legal/contable antes de runtime.

### Fases HNBE26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| HNBE26-00 | P0 | completed | Baseline documental: plan, prompts, contexto y AuditLock; no toca runtime. |
| HNBE26-01 | P0 | completed | Verificacion forense Base44 vs Nomina-Ec: modelos, pantallas, permisos, planes y brechas. |
| HNBE26-02 | P0 | completed | Contrato legal-parametrico Ecuador: parametros, fuentes, vigencias, validadores y LOPDP. |
| HNBE26-03 | P0 | completed | Modelo backend laboral: empleado, contrato, asistencia, novedad, beneficio, nomina, documento y auditoria. |
| HNBE26-04 | P0 | completed | Motor de calculo de nomina con desglose ampliado, costo empleador y reapertura auditada. |
| HNBE26-05 | P0 | completed | Asistencia mobile/PWA: marcacion, geocerca y aprobacion explicita fuera de perimetro. |
| HNBE26-06 | P1 | completed | Beneficios, documentos laborales y autoservicio empleado documentados con brechas. |
| HNBE26-07 | P1 | completed | Gestion de planes, perfiles y permisos RRHH sin catalogos paralelos. |
| HNBE26-08 | P1 | completed | Reporteria laboral, dashboards, exportables y trazabilidad operacional documentados. |
| HNBE26-09 | P0 | completed | Gates, validacion legal/contable pendiente, seguridad y cierre. |

### Reglas HNBE26

- `HNBE26-00` no toca runtime.
- No iniciar `HNBE26-01` sin `.vscode/AuditLock.json` firmado para `HNBE26-00`.
- Cada fase requiere aprobacion explicita por prompt.
- No adelantar tareas de fases posteriores.
- Todo parametro legal debe incluir vigencia, fuente oficial, fecha de carga, responsable y evidencia.
- Ningun calculo de nomina puede depender de constantes hardcodeadas en UI/mobile.
- Todo cierre de nomina debe ser idempotente, auditable y reversible mediante flujo documentado.
- Datos bancarios, geolocalizacion, salud/subsidios y documentos laborales se tratan como datos sensibles LOPDP.
- No crear catalogos de planes paralelos; usar `Plan`, servicios de plan y catalogos compartidos existentes.
- Commits esperados: `phase: HNBE26-XX task: ...`.

---

## Open Haiky Plan - HAIKY-PRODUCTIZACION-NOMINA-EC-DOCUMENTO-NOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-PRODUCTIZACION-NOMINA-EC-DOCUMENTO-NOMINA-2026 |
| Codigo | PNE26 |
| Estado | PNE26-01..16 ejecutadas en pasada local con bloqueos externos documentados |
| Fase actual | PNE26-16 cerrada localmente; bloqueos externos pendientes |
| Alcance | convertir `nuevo_nomina` en sistema real de nomina y RRHH Ecuador, con gobierno tecnico, legal, operativo y comercial |
| Fuente de requerimiento | `C:\proyectos web\Docs\documento_nomina.md` |
| Plan doc | `docs/PLAN_HAIKY_PRODUCTIZACION_NOMINA_EC_DOCUMENTO_NOMINA.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/PRODUCTIZACION-NOMINA-EC-2026-{00..16}-*.md` |
| RULES | `RULES.md` |

### Resumen PNE26

PNE26 toma el diagnostico de `documento_nomina.md` y lo convierte en un plan ejecutable sobre el stack real de Nomina-Ec: Express, PostgreSQL, Prisma, React, Expo y Render. El plan emula los prompts funcionales del documento fuente, pero no adopta Base44 como arquitectura ni como fuente normativa.

El objetivo es pasar de boceto o prototipo a sistema productizable mediante fases con aprobacion explicita, `AuditLock`, reportes por fase, pruebas, rollback documentado, parametros legales versionados, auditoria, RLS, LOPDP, PayPhone, PWA, app movil y validacion legal/contable antes de produccion.

### Fases PNE26

| Fase | Estado | Resumen |
|------|--------|---------|
| PNE26-00 | completed | Baseline documental, plan, prompts y AuditLock sin tocar runtime. |
| PNE26-01 | completed_local | Contrato tecnico de datos, ORM, migraciones, errores y multi-tenant. |
| PNE26-02 | completed_local_with_professional_block | Parametros legales Ecuador versionados y matriz de cumplimiento. |
| PNE26-03 | completed_local | Identidad visual, layout operativo y navegacion por rol. |
| PNE26-04 | completed_local | Autenticacion, RBAC, tenant activo y perfiles laborales. |
| PNE26-05 | completed_local | Empresas, onboarding OWNER y configuracion inicial. |
| PNE26-06 | completed_local | Empleados, contratos, datos bancarios cifrados y ficha laboral. |
| PNE26-07 | completed_local | Marcaciones, geocerca, novedades y aprobaciones. |
| PNE26-08 | completed_local_with_professional_block | Motor de nomina ecuatoriana, cierre, reapertura y casos dorados. |
| PNE26-09 | completed_local_with_legal_review_required | Liquidaciones, finiquito, equipos y desvinculacion. |
| PNE26-10 | completed_local_with_external_storage_block | Documentos legales, roles PDF, contratos, ATS y custodia. |
| PNE26-11 | completed_local | Archivos bancarios configurables y conciliacion de totales. |
| PNE26-12 | completed_local | Reportes operativos, regulatorios y exportables. |
| PNE26-13 | completed_local_with_render_block | Auditoria visible, LOPDP, cifrado, RLS y trazabilidad. |
| PNE26-14 | completed_local | Automatizaciones, cron jobs, Redis y notificaciones. |
| PNE26-15 | completed_local_with_payphone_block | Planes, suscripciones, PayPhone y capacidades comerciales. |
| PNE26-16 | completed_local_with_external_blocks | QA end-to-end, CI/CD, Render y evidencia productizable. |

### Reglas PNE26

- No iniciar una fase funcional sin aprobacion explicita del prompt correspondiente.
- No adelantar tareas de fases posteriores.
- No modificar API publica sin plan de compatibilidad.
- No aplicar migraciones sin rollback documentado.
- No introducir parametros legales sin vigencia, fuente, fecha de carga y responsable.
- No calcular nomina con constantes hardcodeadas en frontend, mobile o servicios aislados.
- No generar archivo bancario con cuenta placeholder, cuenta sin validar o datos sin cifrado.
- No cerrar nomina sin idempotencia, auditoria y evidencia de calculo.
- No eliminar marcaciones ni historicos laborales sensibles.
- No guardar documentos, geolocalizacion, fotos o cuentas bancarias sin politica LOPDP.
- No aceptar fallos silenciosos; todo error debe exponer `code`, `statusCode`, `correlationId` y contexto seguro.
- Commits esperados: `phase: PNE26-XX task: ...`.

---

# Contexto operativo Codex - Plan HAIKY

Proyecto: Nómina-Ec, SaaS de nómina Ecuador.  
Raíz: `C:\proyectos web\nuevo_nomina`.  
Repositorio remoto: `https://github.com/SINKRONET-SAS/nomina-ec.git`.  
Rama activa esperada: rama de trabajo vigente Nomina-Ec.  
Fecha de contexto: 2026-06-12.

## Regla principal

Antes de modificar código runtime se debe leer `RULES.md` y validar `.vscode/AuditLock.json`.

## Componentes

- `backend`: Express, PostgreSQL con `pg`, Prisma para migraciones, JWT, S3, Redis, cron jobs, cálculos de nómina, reportes y documentos.
- `frontend-web`: React + Vite + Tailwind + React Router + TanStack Query.
- `app-movil`: Expo + React Native.
- `docs`: documentación legal existente.
- `docs2`: planes HAIKY, diagnósticos y runbooks.

## Estado técnico vigente

- Prisma 6 está instalado y `backend/prisma/schema.prisma` existe.
- La migración inicial y migraciones incrementales existen en `backend/prisma/migrations`.
- `backend/src/config/migrate.js` ejecuta `prisma migrate deploy`.
- PostgreSQL local fue validado en `127.0.0.1:5432`.
- Redis/Memurai local fue validado en `127.0.0.1:6379`.
- `render.yaml` define API, worker cron, frontend estático y PostgreSQL.
- El backend runtime sigue usando `pg` directo; Prisma gobierna migraciones.
- El generador bancario usa perfiles configurables y descifra cuentas solo en memoria.
- `SUPERADMIN` y `OWNER` tienen seed seguro por variables de entorno.
- RLS existe en migración SQL y cuenta con runbook/script de verificación Render; falta ejecutarlo con usuario no superusuario de staging.
- AWS SDK v2 fue reemplazado por AWS SDK v3 modular en S3.
- Valores legales 2026 tienen IR SRI, SBU MDT e IESS reconfirmados; otros parametros sensibles mantienen revision profesional antes de produccion.
- La marca visible correcta del sistema es `Nómina-Ec`; `Plan HAIKY` queda reservado para metodología interna de planificación.
- Existe PWA, landing, login, registro, recuperación de contraseña, planes y PayPhone/mock en primera versión.
- Se realizó segunda pasada UI/UX para corregir pantalla en bruto y agregar CSS/Tailwind real.
- Se realizó segunda pasada documental para orientar Nómina-Ec como plataforma parametrizable.
- Se ejecutaron fases 28 a 34 en primera versión productizable: migración de parametrización, API protegida, UI de configuración, checklist OWNER y evidencia QA local.

## Orden HAIKY revisado

1. Fase 0: preparación, diagnóstico y candado.
2. Fase 1: dependencias y reproducibilidad.
3. Fase 2: GitHub y rama.
4. Fase 3: PostgreSQL y Redis.
5. Fase 4: Prisma y migraciones.
6. Fase 5: Render.
7. Fase 6: legal Ecuador y redondeos.
8. Fase 7: archivos bancarios.
9. Fase 8: SUPERADMIN, OWNERS y RBAC.
10. Fase 9: empleados y experiencia operativa.
11. Fase 10: marcaciones y novedades.
12. Fase 11: motor de nómina.
13. Fase 12: liquidación y finiquito.
14. Fase 13: documentos regulatorios.
15. Fase 14: reportes y auditoría visible.
16. Fase 15: automatizaciones.
17. Fase 16: pruebas, CI/CD y hardening.
18. Fase 17: validación legal Ecuador 2026.
19. Fase 18: migración AWS SDK v3.
20. Fase 19: prueba RLS Render con usuario no superusuario.
21. Fase 20: renombre de producto a Nómina-Ec.
22. Fase 21: landing pública Nómina-Ec.
23. Fase 22: PWA Nómina-Ec.
24. Fase 23: auth backend, registro y recuperación.
25. Fase 24: auth PWA y app móvil.
26. Fase 25: planes y suscripciones Nómina-Ec.
27. Fase 26: PayPhone como canal de pago.
28. Fase 27: legal, QA comercial y Render.
29. Fase 28: núcleo de parametrización.
30. Fase 29: parámetros legales versionados.
31. Fase 30: tipos de novedades configurables.
32. Fase 31: estructura organizativa y centros de costo.
33. Fase 32: zonas, jornadas y calendarios.
34. Fase 33: onboarding operativo del OWNER.
35. Fase 34: QA end-to-end productizable.

## Gobierno de parametrización

El sistema debe permitir configuración por tenant, vigencia, fuente y rol para:

- Parámetros legales: SBU, IR, IESS, décimos, vacaciones, horas extra, liquidación y redondeos.
- Tipos de novedades: impacto en nómina, IESS, IR, décimos, vacaciones, bancos y aprobaciones.
- Estructura organizativa: empresas, sedes, departamentos, cargos, equipos, centros de costo y jerarquías.
- Zonas y asistencia: geocercas, precisión, reglas de foto/GPS, excepciones y teletrabajo.
- Jornadas y calendarios: turnos, tolerancias, feriados, descansos, nocturnidad y reglas de atraso.
- Bancos: perfiles de archivo plano, validaciones, checksum y auditoría.
- Planes comerciales: límites por empleados, empresas, usuarios, documentos, bancos, reportes y soporte.

## Criterios de escritura

- Guardar `.js`, `.md` y `.json` como UTF-8 sin BOM.
- No dejar `catch` vacíos ni retornos silenciosos.
- Documentación en español técnico.
- Variables de código en inglés.
- Logs y errores visibles en español.

## Pendientes críticos

- Ampliar el núcleo runtime de parametrización con integraciones completas en nómina, marcaciones, bancos y reportes.
- Profundizar integración de novedades, jornadas y zonas con motor de nómina y marcaciones.
- Mantener evidencia IESS 2026 y revisar casos especiales por regimen, sector o tipo de relacion antes de produccion.
- Probar RLS en Render con usuario no superusuario y evidencia sin secretos.
- Completar pruebas automatizadas de regresión para liquidación, RBAC, bancos y aislamiento tenant.
- Validar PayPhone sandbox/oficial con webhook, firma, conciliación e idempotencia.
- Ejecutar smoke visual manual de PWA con backend activo.

---

## LPA26 - Landing, PWA, app stores y LOPDP

Plan: `HAIKY-LANDING-PWA-APP-STORE-NOMINA-EC-2026`.

Estado: fases LPA26-00 a LPA26-08 ejecutadas localmente con commits por fase y AuditLock firmado.

Entregables principales:

- Landing publica actualizada para interes comercial de Nomina-Ec.
- PWA con manifest `es-EC`, screenshots, shortcuts y smoke que valida que `/api` queda en `NetworkOnly`.
- App movil Expo con `app.json`, `eas.json`, assets PNG de tienda, metadata y checks locales.
- Politicas publicas de privacidad, terminos, soporte y eliminacion de cuenta.
- Consentimiento de cookies/medicion no esencial y consentimiento LOPDP versionado en registro OWNER.
- Documentos LOPDP de incidentes, procesadores/DPA, retencion y derechos.
- Runbook go-live, QA visual y release stores.

Comandos validados:

- `npm.cmd run smoke:pwa` en `frontend-web`.
- `npm.cmd run check:stores` en `app-movil`.
- `npx.cmd expo-doctor` en `app-movil` con 21/21 checks passed.

Bloqueos externos:

- Revision legal LOPDP profesional antes de produccion.
- Google Play Console, Apple Developer y App Store Connect.
- EAS `projectId`, `appleTeamId`, `ascAppId`, certificados y perfiles reales.
- URLs productivas reales para privacidad, terminos, soporte y eliminacion de cuenta.

---

## ONI26 - Operacion integral Nomina-Ec

Plan: `HAIKY-OPERACION-NOMINA-EC-INTEGRAL-2026`.

Estado: ONI26-00 cerrado documentalmente. No se ha tocado runtime para esta linea.

Alcance:

- Mejora de sitio publico: landing, link publico, inicio y crear cuenta.
- Mapeo de parametros de nomina a cuentas contables.
- RDEP con ficha tecnica, XSD y XML.
- Entorno SUPERADMIN: planes, addons, contratos owners, incidencias y catalogos globales.
- Entorno OWNER: archivos planos de bancos segun fichas tecnicas, usuarios, roles y accesos.
- API de integracion para otros sistemas.
- Asistencia manual y marcacion APP.
- Seeds de parametros y empresa DEMO.
- Apertura de mes y lote de novedades por estructura organizativa.
- Carga masiva de empleados.
- Reportes de nomina en PDF y Excel tabular.
- Dashboard con headcount.
- Humanizacion de mensajes tecnicos.
- Pruebas end to end con datos smoke no reales.

Gobierno:

- No tocar runtime antes de ONI26-01.
- No crear modulos paralelos a landing, registro, parametrizacion, app o reportes existentes.
- Cada fase debe firmar AuditLock y usar commit `phase: ONI26-XX task: ...`.
- RDEP, bancos y API requieren contrato/ficha tecnica antes de implementacion.

### Ejecucion ONI26 2026-06-14

Estado: ONI26-00 a ONI26-14 ejecutadas localmente con commits por fase y AuditLock firmado.

Entregables principales:

- Diagnostico integral anti-churn.
- Sitio publico ajustado para inicio, link publico y crear cuenta.
- Mapeo contable parametrizable por tenant.
- RDEP documentado con XSD versionado, fuentes SRI y bloqueo de validacion vigente.
- Gobierno SUPERADMIN para planes, addons, owners, contratos e incidencias.
- Matriz OWNER para bancos, archivos planos, usuarios, roles y accesos.
- Contrato API v1 cerrado hasta gate de seguridad.
- Politica de asistencia manual y marcacion APP con LOPDP.
- Seed empresa DEMO con datos ficticios y fuente SRI.
- Flujo de apertura mensual y lotes de novedades.
- Contrato de carga masiva de empleados con plantilla DEMO.
- Catalogo de reportes PDF, Excel tabular y CSV.
- Metricas de dashboard y headcount.
- Catalogo de mensajes humanizados y runbook QA/release.

Fuentes SRI revisadas:

- `https://www.sri.gob.ec/formularios-e-instructivos1`
- `C:\Users\proam\Downloads\Esquema RDEP 2023.xsd`
- `C:\Users\proam\Downloads\NAC-DGERCGC24-00000037.pdf`
- `C:\Users\proam\Downloads\Catálogo vigente para el ejercicio fiscal 2024 (1).xls`
- `C:\Users\proam\Downloads\Formulario_107 - Formato 2023 (2).xls`
- `C:\Users\proam\Downloads\Tablas de cálculo de Impuesto a la Renta (2).pdf`

Bloqueos externos:

- Confirmar ficha tecnica RDEP vigente del ejercicio fiscal objetivo antes de XML productivo.
- Validar fichas tecnicas bancarias por banco.
- Implementar y probar RBAC/API/runtime antes de habilitar clientes externos.
- Ejecutar QA E2E con backend y datos DEMO.

---

## DCF26 - Diagnostico y cierre funcional Nomina-Ec

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`.

Estado: DCF26-00 a DCF26-12 ejecutadas localmente con segunda pasada runtime, commits por fase y AuditLock firmado.

Motivo:

- El usuario detecto que parte del avance queda oculto o parece backend/documental.
- La parametrizacion y operacion integral deben dejar pantallas, importaciones, acciones UI/UX y procesos reales, no solo registros genericos.
- El alcance es cerrar la funcionalidad de todo el plan, con evidencia visible y sin churn.

Diagnostico ejecutado el 2026-06-15:

- `npm.cmd test -- --runInBand` en `backend`: PASS, 9 suites y 22 tests; riesgo por lentitud de 182.121 s.
- `npm.cmd run build` en `frontend-web`: PASS, Vite build y PWA generados.
- `npx.cmd prisma validate` en `backend`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- Revision estatica con `rg` y lectura directa de pantallas, servicios, rutas, reportes y configuracion.

Hallazgos P0:

- `OperacionIntegral` guarda JSON generico en `configuration_catalogs` para modulos que prometen procesos reales.
- Bancos configurados por OWNER no gobiernan aun `bancoAebGenerator`, que usa `bank-file-profiles.json`.
- RDEP genera XML sin validacion XSD runtime ni reconciliacion vigente completa.
- ATS sigue activo en backend de reportes de nomina aunque no debe pertenecer al flujo de nomina.
- API externa `/api/v1` esta documentada, pero no expuesta como rutas funcionales.
- Avance operativo se basa en conteos o pasos completados, no en readiness funcional verificable.
- Carga masiva y apertura mensual/lotes existen como catalogos, no como flujos ejecutables.

Hallazgos P1/P2:

- SUPERADMIN tiene riesgo de duplicidad entre planes reales y catalogos genericos.
- Persisten `alert()` y `window.open()` en flujos criticos.
- Hay mojibake en runtime/backend y metadatos.
- La app movil pasa readiness formal, pero su alcance funcional aun es minimo.
- `docs2` contiene artefactos `Qwen_python_*.py` que deben limpiarse o archivarse.
- Backend tests pasan, pero hay prueba lenta relevante.

Entregables principales DCF26:

- `docs2/PLAN_HAIKY_DIAGNOSTICO_CIERRE_FUNCIONAL_NOMINA_EC_2026.md`
- `docs2/diagnostico-cierre-funcional-nomina-ec-2026/REPORTE_DCF26_01_DIAGNOSTICO_CONSULTIVO.md`
- `docs2/diagnostico-cierre-funcional-nomina-ec-2026/MATRIZ_DCF26_HALLAZGOS.md`
- `docs2/diagnostico-cierre-funcional-nomina-ec-2026/REPORTE_DCF26_02_OPERACION_REAL.md` a `REPORTE_DCF26_12_QA_LIMPIEZA_RELEASE.md`
- `docs2/diagnostico-cierre-funcional-nomina-ec-2026/RUNBOOK_DCF26_12_E2E_DEMO.md`
- `docs2/archive/qwen-python-20260616/README.md`
- `.github/prompts/DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026-00..12-*.md`
- `.vscode/AuditLock.json`

Runtime cerrado:

- Operacion integral deja de guardar catalogos genericos para P0 y apunta a pantallas/procesos reales.
- Bancos OWNER alimentan el generador de archivo plano con perfil tenant.
- RDEP tiene precheck y validacion XSD runtime; ATS queda fuera del flujo de nomina.
- API externa `/api/v1` existe con autenticacion, scopes, rate limit, idempotencia y auditoria.
- Empleados tiene carga masiva con plantilla DEMO, prevalidacion, commit atomico, lote auditable y reversa segura.
- Nomina tiene apertura de periodo y lotes de novedades por estructura organizativa.
- SUPERADMIN gestiona planes, owners/incidencias desde fuentes reales.
- App movil tiene endpoints `/api/mobile`, marcacion, historial y autoservicio minimo.
- Frontend web queda sin `alert`, `confirm` ni `window.open` en runtime.
- `docs2/Qwen_python_*.py` queda archivado como evidencia historica sin reuso operacional.

Gates finales DCF26-12:

- `npm.cmd test -- --runInBand` en `backend`: PASS, 17 suites y 60 tests, 4.472 s.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npx.cmd prisma validate` en `backend`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- Parse JSX app movil: PASS, `MOBILE_JSX_PARSE_OK`.
- `rg` de ATS runtime y popups nativos web: sin coincidencias.

Bloqueos residuales controlados:

- Validacion legal/tributaria/laboral profesional para RDEP, bancos, IESS y parametros antes de produccion.
- Rate limit compartido API v1 en staging multi-instancia.
- Cuentas y certificados reales Google Play, Apple Developer/EAS y URLs productivas.
- Relacion formal usuario-empleado para reemplazar resolucion movil por `email_personal`.
- Smoke visual con navegador integrado quedo pendiente por herramienta no disponible; repetir con `RUNBOOK_DCF26_12_E2E_DEMO.md`.

Regla operativa DCF26:

- Ninguna fase puede cerrarse si solo deja documentos o catalogos genericos.
- Toda fase de runtime debe exponer frontend, importaciones, pantalla o accion visible, endpoint/servicio, prueba y evidencia.
- Cada fase requiere AuditLock firmado y commit `phase: DCF26-XX task: ...`.

---

## E2E26 - Diagnostico end-to-end y correccion definitiva Nomina-Ec

Plan: `HAIKY-DIAGNOSTICO-E2E-CORRECCION-DEFINITIVA-NOMINA-EC-2026`.

Estado: E2E26-01..09 ejecutadas localmente. Runtime cerrado con demo comercial resembrada.

Fuente:

- `G:\ARVIEDO\Diagnostico_E2E.docx`

Alcance:

- Registro publico, tenant, owner, correo verificado y consentimiento LOPDP.
- Estado operacional minimo antes de nomina.
- Login tenant-aware y ambiguedad por email multi-tenant.
- Ficha de empleado preliminar/operativa, cedula por tenant, cifrado bancario y auditoria laboral.
- Invitaciones app empleado con expiracion, reenvio, revocacion y tablero RRHH.
- Asistencia movil con readiness fail-closed, GPS/foto/almuerzo alineados con README/API/app.
- Novedades con periodo, lote, granularidad y bloqueo de pendientes.
- Calculo transaccional con estado `calculation_failed` si hay errores por empleado.
- Cierre atomico con roles PDF, beneficios/deducciones y preclose gate.
- Reapertura controlada con reverso o rectificacion auditable.
- Scripts E2E de diagnostico, expiracion de invitaciones, pre-cierre y riesgo de reapertura.

Artefactos:

- `docs2/PLAN_HAIKY_DIAGNOSTICO_E2E_CORRECCION_DEFINITIVA_NOMINA_EC_2026.md`
- `docs2/diagnostico-e2e-correccion-definitiva-nomina-ec-2026/MATRIZ_E2E26_HALLAZGOS.md`
- `docs2/diagnostico-e2e-correccion-definitiva-nomina-ec-2026/REPORTE_E2E26_00_BASELINE.md`
- `docs2/diagnostico-e2e-correccion-definitiva-nomina-ec-2026/RUNBOOK_E2E26_CORRECCION_DEFINITIVA.md`
- `.github/prompts/DIAGNOSTICO-E2E-CORRECCION-DEFINITIVA-NOMINA-EC-2026-00..09-*.md`
- `.vscode/AuditLock.json`

Fases:

- E2E26-00: baseline documental.
- E2E26-01: estado operacional del tenant.
- E2E26-02: identidad y login tenant-aware.
- E2E26-03: empleados y ficha operativa.
- E2E26-04: invitaciones app y comunicaciones.
- E2E26-05: asistencia movil y coherencia funcional.
- E2E26-06: novedades por periodo y lotes.
- E2E26-07: calculo transaccional.
- E2E26-08: cierre atomico, roles y reapertura controlada.
- E2E26-09: QA y release gate E2E.

Reglas operativas E2E26:

- No tocar runtime antes de aprobacion explicita de fase.
- No aplicar scripts del diagnostico literalmente; adaptarlos al schema real y servicios existentes.
- Todo bloqueo operativo debe quedar visible en PWA/app.
- No cerrar nomina con errores por empleado, novedades pendientes, empleados sin nomina valida o roles requeridos faltantes.
- No llamar inmutable a una nomina que puede reabrirse; usar reapertura controlada con auditoria/reverso.
- Cada fase requiere AuditLock firmado y commit `phase: E2E26-XX task: ...`.

### Ejecucion E2E26 2026-06-22

Runtime cerrado:

- `seed:demo:reset` fue ejecutado primero; como el comando elimina el tenant demo DCEN26, se reconstruyo despues con `seed:demo` y se verifico con `seed:demo:verify`.
- Migracion `20260622164000_e2e26_employee_cedula_by_tenant` aplicada localmente; `empleados.cedula` deja de ser unica global y pasa a `tenant_id + cedula`.
- Login web/app queda tenant-aware: si el mismo correo existe en varias empresas con clave valida, no selecciona una al azar y solicita RUC.
- Importacion/alta de empleados valida cedulas duplicadas por tenant.
- Invitaciones app expiran automaticamente al listar/reintentar, con metadata `expiredBy: E2E26`.
- Asistencia movil expone inicio/fin de almuerzo y el backend valida secuencia diaria de marcacion.
- Calculo de nomina ejecuta prechequeo E2E26 y deja `payroll_periods.status = calculation_failed` si existen errores por empleado.
- Cierre de nomina exige preclose gate: periodo calculado, novedades sin pendientes, empleados activos con nomina borrador y fichas operativas.
- Reapertura exige periodo cerrado, motivo minimo y registra `lastReopen` en `payroll_periods.summary`.
- PWA de cierre muestra blockers/warnings del prechequeo para que el usuario sepa que corregir.

Gates ejecutados:

- `npx.cmd prisma validate` en `backend`: PASS.
- `npx.cmd prisma migrate deploy` en `backend`: PASS.
- `npm.cmd run seed:demo:reset` en `backend`: PASS, elimino 1 tenant demo.
- `npm.cmd run seed:demo` en `backend`: PASS, demo reconstruida.
- `npm.cmd run seed:demo:verify` en `backend`: PASS, 1 tenant, 4 usuarios, 30 empleados, 1.284 marcaciones, 101 novedades, 5 periodos cerrados y 150 roles cerrados.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 27 suites y 105 tests.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- `npm.cmd run doctor` en `app-movil`: PASS, 18/18 checks.

Riesgos residuales controlados:

- Roles PDF productivos siguen dependiendo del generador/almacenamiento real; el prechequeo avisa si faltan.
- La captura de foto movil no se agrego para no introducir dependencia de camara en Expo Go; el backend conserva soporte `fotoBase64`.
- Revision legal/contable/LOPDP profesional sigue requerida antes de produccion.

---

## ANV1 - Auditoria Nomina-Ec 2026 V1

Plan: `HAIKY-AUDITORIA-NOMINA-EC-2026-V1`.

Estado: ANV1-01..08 ejecutadas localmente en runtime; validacion final pendiente al momento de registrar este contexto.

Fuentes revisadas:

- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V1.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v1_data.jsx`
- `C:\proyectos web\sinkroniq-mobile` para PayPhone y gestion de planes.
- `C:\proyectos web\sinkroniq-mobile` para patrones LOPDP: consentimientos, exportacion, anonimizado y sanitizacion de auditoria.

Alcance ejecutado:

- `CODEX_CONTEXT.md` fue movido desde raiz a `.github/CODEX_CONTEXT.md`; el contrato raiz bloquea que vuelva a raiz.
- Runtime activo cambio defaults/config de base y Render a nombres Nomina-Ec; archivos historicos archivados no se reescriben.
- PayPhone se alinea al patron de `sinkroniq-mobile`: gateway `Prepare`, `Confirm`, referencia unica `nominaec-*`, callback backend HTTPS, bloqueo si mock/config incompleta, verificacion de monto antes de activar suscripcion y ruta de cancelacion.
- Gestion de planes versiona un plan editado si tiene suscripciones activas, para no mutar retroactivamente contratos comerciales.
- Calculo de nomina agrega IESS por afiliacion/tipo de relacion laboral, limite semanal de horas extra, periodos explicitos de decimo tercero y decimo cuarto regional.
- Ficha de trabajador, importacion y PWA exponen `iess_afiliado` y `iess_tipo_relacion`.
- Lectura de fichas laborales queda protegida por RBAC; owner/admin_rrhh/superadmin auditan lectura salarial y supervisor recibe campos sensibles redactados.
- LOPDP agrega `consent_preferences`, API `/api/privacidad/*`, exportacion JSON auditada, retiro de consentimientos opcionales, anonimizado superadmin con bloqueo del unico owner activo y pantalla `/dashboard/privacidad`.
- Auditoria redacta cedula, identificacion, sueldo, salario, remuneracion, gastos personales, cuentas, tokens y buffers.
- Se creo ruta/pagina explicita `frontend-web/src/pages/Superadmin.jsx` protegida por rol superadmin.

Artefactos:

- `docs2/PLAN_HAIKY_AUDITORIA_NOMINA_EC_2026_V1.md`
- `docs2/auditoria-nomina-ec-2026-v1/MATRIZ_ANV1_HALLAZGOS.md`
- `docs2/auditoria-nomina-ec-2026-v1/CONTRATO_ANV1_CIERRE_DEFINITIVO.md`
- `docs2/auditoria-nomina-ec-2026-v1/RUNBOOK_ANV1_QA_RELEASE.md`
- `docs2/auditoria-nomina-ec-2026-v1/REPORTE_ANV1_01_08_CIERRE_RUNTIME.md`
- `.github/prompts/AUDITORIA-NOMINA-EC-2026-V1-00..08-*.md`

Riesgos residuales:

- PayPhone requiere `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID` y `BACKEND_PUBLIC_URL` HTTPS reales antes de cobro productivo.
- La geolocalizacion movil mantiene snapshot de consentimiento existente; el retiro operativo de geolocalizacion requiere fase adicional que bloquee marcacion movil antes de exponerse como toggle.
- Las reglas legales quedan parametrizadas y probadas, pero requieren validacion laboral/contable ecuatoriana antes de release comercial.
- El renombre de DB/usuario en Render requiere migracion controlada en infraestructura si ya existe una instancia productiva previa.

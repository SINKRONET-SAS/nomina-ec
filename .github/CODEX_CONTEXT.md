
---

## Current Haiky Plan - HAIKY-NOVEDADES-EMPLEADO-RECALCULO-SELECTIVO-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-NOVEDADES-EMPLEADO-RECALCULO-SELECTIVO-2026 |
| Codigo | NER26 |
| Estado | completed-pass |
| Fecha | 2026-07-15 |
| Superficie | BACKEND, PWA, REPORTES, GOBIERNO |
| Plan doc | `docs/PLAN_HAIKY_NOVEDADES_EMPLEADO_RECALCULO_SELECTIVO_2026.md` |
| Reporte | `docs/novedades-empleado-recalculo-selectivo-2026/REPORTE_NER26_00_03_EJECUCION.md` |
| Prompts | `.github/prompts/NER26-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Decisiones NER26

- Una novedad individual consumida por rol no debe empujar al descarte global del periodo.
- La invalidacion individual exige `tenant_id`, `anio`, `mes` y `empleado_id` en la consulta destructiva.
- Los roles cerrados o pagados siguen inmutables; si el periodo esta cerrado se retorna `NOMINA_CERRADA_REQUIERE_REAPERTURA`.
- La PWA muestra novedades consumidas con accion para liberar solo el calculo del empleado y luego recalcular solo ese empleado.
- La accion global de cierre mensual queda rotulada como descarte del periodo para distinguirla de la correccion individual.
- El rol individual y el rol consolidado transpuesto deben reflejar tipos nuevos de novedad desde las lineas normalizadas del calculo, no desde una lista fija.
- El PDF de rol debe consultar `payroll_calculation_lines` para no omitir descuentos dinamicos persistidos.

### Runtime NER26

- `payrollLifecycleService.invalidateEmployeePayrollForNovelty()` invalida solo el rol borrador del empleado afectado y registra auditoria `novedades.empleado.invalidar_calculo`.
- `calculoNominaService.calcularNominaEmpleado()` recalcula un solo trabajador con lote `scope = employee`.
- `nominaController` expone `POST /api/nomina/:anio/:mes/empleados/:empleadoId/invalidar-calculo` y `POST /api/nomina/:anio/:mes/empleados/:empleadoId/recalcular`.
- `novedadController.listarPendientes(scope=operativas)` ya no oculta novedades consumidas por rol.
- `NovedadesPendientes.jsx` expone las acciones `Liberar calculo solo de este empleado` y `Recalcular solo este empleado`.
- `payrollRolePdfService` arma novedades dinamicas desde `payroll_calculation_lines` o `detalle_calculo.novedadesCalculadas` para rol individual y transpuesto.
- `generatePayrollRolePdf()` y `generatePayrollRolePeriodTransposedPdf()` agregan `calculation_lines` desde `payroll_calculation_lines` por `payroll_id` y `tenant_id`.

### Gates NER26

- `node --check` en servicios/controladores modificados: PASS.
- Backend focal: 4 suites / 65 tests PASS.
- PWA build: PASS, 1534 modules y 100 precache entries.
- Contratos del sistema: PASS.
- Prisma validate: PASS.
- Rol PDF dinamico: `node --check backend/src/services/payrollRolePdfService.js` PASS y `payrollRolePdfService.test.js` PASS, 9 tests.
- Integridad NER26: UTF-8 sin BOM y `git diff --check` scoped PASS; el diff global queda bloqueado por conflictos locales previos en mobile/workflow no incluidos en NER26.

## Current Haiky Plan - HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026 |
| Codigo | AIV28 |
| Estado | completed-pass |
| Fecha | 2026-07-14 |
| Superficie | LANDING, PWA, BACKEND, MOBILE |
| Plan doc | `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_V28_NOMINA_EC_2026.md` |
| Informe | `docs2/auditoria-integral-v28-nomina-ec-2026/INFORME_DIAGNOSTICO.md` |
| Diagnostico JSON | `docs2/auditoria-integral-v28-nomina-ec-2026/DIAGNOSTICO_JSON.json` |
| Scripts | `docs2/auditoria-integral-v28-nomina-ec-2026/SCRIPTS_JS_SOLUCION.md` |
| Prompts | `.github/promts/AIV28-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Decisiones AIV28

- Incremento AIV28-08 (2026-07-15): los lotes mensuales consumen el catalogo parametrizado de novedades; al elegir un concepto contable existente la PWA entra en edicion y el backend actualiza de forma idempotente la misma clave concepto/asiento/vigencia, sin exponer errores PostgreSQL.
- Incremento AIV28-07 (2026-07-15): `POST /api/nomina/precalcular` ejecuta el motor real y revierte la transaccion completa; la PWA separa vista previa y calculo, conserva nombre y cedula en errores/resultados y resuelve etiquetas humanas en los lotes individuales.
- Hotfix AIV28-06 (2026-07-15): el calculo parcial usa savepoints por empleado y la migracion `20260715121500_payroll_batch_partial_failed` habilita el estado `partial_failed`; los errores SQL internos se registran en backend y la PWA presenta una orientacion segura por empleado.
- NO se migra a Python. El motor Node.js esta legalmente validado, en produccion y con cobertura de tests. Reescribir introduce riesgo de regresion legal inaceptable.
- Cumplimiento legal Ecuador 2026 CONFORME en los 13 parametros verificados (SBU, IESS, decimos, IR, HE, vacaciones, fondo reserva).
- 7 hallazgos reales: 1 alto (SQLite mobile sin cifrado), 3 medios (batch silencioso, dias=0, base64 upload), 3 bajos (rate limit, validacion, GPS).
- 4 falsos positivos descartados (precision monetaria, integridad totales, tenantId nullable, webhook firma).
- 2 riesgos aceptados (tokens localStorage con mitigacion, console.error estructurado).
- H-05 (rate limiting) y H-06 (validacion centralizada) diferidos a fase futura.

### Cambios AIV28

- `backend/src/services/calculoNominaService.js`: batch reporta `partial_failed` cuando hay errores parciales; valida `diasTrabajados > 0` antes de calcular.
- `app-movil/src/screens/OperacionMovilScreen.js`: validacion de rango GPS lat [-90,90] lng [-180,180] en zonas y sitios.
- `app-movil/src/screens/PermisosScreen.js`: upload de soporte medico migrado de base64-en-RAM a FormData multipart.
- `backend/src/services/payrollRolePdfService.js`: rol de pago landscape, sin formula HE, sin provisiones, firma desde config empresa.
- `backend/src/services/templateGenerator.js`, `equipmentDeliveryActService.js`: "Documento generado con SKNOMINA".

### Gates AIV28

- Backend: 57 suites / 375 pruebas PASS.
- Prisma validate PASS.
- PWA build PASS (1534 modules, 100 precache entries).
- Evaluacion de migracion Python: NO RECOMENDADO.

---

## Incremento ejecutado - HRC26 correccion y recalculo de roles

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CORRECCION-RECALCULO-ROLES-2026 |
| Fase | HRC26-05 |
| Estado | completed-pass |
| Fecha | 2026-07-14 |
| Plan doc | `docs2/PLAN_HAIKY_CORRECCION_RECALCULO_ROLES_2026.md` |
| Prompts | `.github/promts/HRC26-{00..05}-*.md` |
| Scripts | `npm run audit:roles:2026`, `npm run haiky:roles:2026` |

### Decisiones HRC26

- `owner` y `admin_rrhh` pueden descartar roles en borrador, corregir novedades o fichas fuente y recalcular con motivo y auditoria.
- Los totales derivados, aportes y bases tributarias no se editan manualmente.
- Los roles `cerrada` y `pagada` son inmutables. El endpoint heredado `/api/nomina/reabrir` conserva compatibilidad, responde `409` y orienta a registrar el ajuste en un periodo abierto.
- MOBILE, historial y correo solo exponen roles finales; los PDF preliminares muestran una marca explicita de borrador.
- La carga manual mensual normaliza fechas `DATE` de PostgreSQL antes de filtrar la vigencia laboral; una carga diaria y una mensual aplican la misma relacion laboral.
- La asistencia manual dispone de plantilla CSV masiva con validacion atomica y combobox de empleados por cedula, nombre, apellido o ID.
- Ecuador 2026: SBU USD 482, IESS 9,45%/11,15%, base mensual 30 dias/240 horas y tabla IR 2026 permanecen versionados en `legal-ecuador.js`.

### Gates HRC26

- Diagnostico HRC26 y auditoria integral V2.
- Contratos de sistema y pruebas focalizadas del ciclo de roles.
- Suite backend completa, Prisma validate y mobile store readiness.
- Build PWA/LANDING, UTF-8 sin BOM/mojibake y `git diff --check`.

## Incremento ejecutado - AIV2-07 asistencia y nomina base 30

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V2-NOMINA-EC-2026 |
| Fase | AIV2-07 |
| Estado | completed-pass |
| Fecha | 2026-07-14 |
| Prompt | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-07-asistencia-nomina.md` |
| Migracion | `backend/prisma/migrations/20260714190000_employee_attendance_control/migration.sql` |

### Decisiones AIV2-07

- Marcacion real y base salarial son conceptos distintos: el reporte cuenta dias con marcacion; nomina prorratea sueldo y faltas aprobadas sobre 30 dias.
- La falta de marcaciones no crea ausencia, descuento ni bloqueo automatico.
- `controla_asistencia` define participacion en app, reportes y cargas globales por empleado; desactivarlo no bloquea el rol.
- Asistencia manual admite alcance individual/global y periodo diario/mensual/rango, hasta 31 dias, sin reemplazar marcas existentes.
- El listado maestro de empleados es vertical XLSX y no expone numeros de cuenta bancaria.

### Gates AIV2-07

- Backend: 55 suites / 347 pruebas PASS.
- Contratos de sistema PASS.
- Prisma validate, migrate deploy y generate PASS.
- Mobile store readiness PASS.
- PWA build PASS.
- Diagnostico integral V2: 286 archivos, cero hallazgos automatizados abiertos.

---

## Current Haiky Plan - HAIKY-AUDITORIA-INTEGRAL-V2-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V2-NOMINA-EC-2026 |
| Codigo | AIV2 |
| Estado | completed-pass |
| Fecha | 2026-07-14 |
| Requerimiento fuente | Auditoria integral nueva sobre LANDING, PWA, BACKEND y MOBILE; mejorar UI/UX, motor de nomina, UTF-8, duplicacion, legal Ecuador 2026, facturacion electronica via SINKRONIQ-MOBILE API, y cerrar con prompts, scripts, AuditLock, commit y push. |
| Plan doc | `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_V2_NOMINA_EC_2026.md` |
| Informe | `docs2/auditoria-integral-v2-haiky-2026/INFORME_DIAGNOSTICO.md` |
| Diagnostico JSON | `docs2/auditoria-integral-v2-haiky-2026/DIAGNOSTICO_JSON.json` |
| Prompts | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-{00..06}-*.md` |
| Scripts | `npm run audit:integral:v2`, `npm run haiky:solution:v2` |
| AuditLock | `.vscode/AuditLock.json`, `.vscode/AudiLock.json`, `AuditLock.json` |

### Decisiones AIV2

- Facturacion electronica se presenta comercialmente como **SINKRONET FACTURADOR**.
- La implementacion tecnica consume API provista por **SINKRONIQ-MOBILE**; SKNOMINA no clona XML, firma electronica, RIDE ni autorizacion SRI.
- Establecimientos IESS quedan parametrizables y monetizables por plan mediante `iess_establecimientos_max`.
- La tasa nominal anual es insumo de calculo entre contado anual y mensualidad; no se muestra como texto suelto.
- Precios publicos deben mostrar mensualidad con IVA, contado anual con IVA y nota de calculo.
- Reportes grandes deben priorizar estructura vertical y no empleados como columnas.

### Cambios AIV2

- `frontend-web/src/App.jsx`: rutas diferidas con `React.lazy` y `Suspense` para reducir chunk inicial.
- `frontend-web/src/utils/downloadBlob.js`: helper unico de descarga Blob; se eliminan copias inline.
- `backend/src/services/calculoNominaService.js`: guard `assertPayrollTotalsIntegrity` y evidencia en `detalle_calculo`.
- `frontend-web/src/components/PublicPlansCatalog.jsx`: texto de precios humanizado con IVA y contado anual.
- `scripts/haiky-integral-v2-diagnostic.mjs` y `scripts/haiky-integral-v2-solution.mjs`: diagnostico y solucion repetibles.

### Gates AIV2

- `npm run audit:integral:v2`
- `npm run haiky:solution:v2`
- `node scripts/verify-system-contracts.mjs`
- `npm.cmd --workspace=backend test -- calculoNominaService.test.js paymentController.test.js fiscalInvoiceService.test.js employeeImportService.test.js --runInBand`
- `npm run prisma:validate`
- `npm run check:mobile`
- `node node_modules/vite/bin/vite.js build` desde `frontend-web`
- `git diff --check`

## Open Haiky Plan - HAIKY-REPORTES-ENTIDADES-PUBLICAS-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-REPORTES-ENTIDADES-PUBLICAS-EC-2026 |
| Codigo | RPE26 |
| Estado | completed-pass |
| Fecha | 2026-07-12 |
| Requerimiento fuente | Revisar Reportes Entidades: confirmar si IESS usa XML, evitar reportes ineficientes para nominas grandes y proponer mejoras ejecutables. |
| Plan doc | `docs2/PLAN_HAIKY_REPORTES_ENTIDADES_PUBLICAS_EC_2026.md` |
| Reporte | `docs2/reportes-entidades-publicas-ec-2026/REPORTE_RPE26_05_IESS_BATCH_ESTABLECIMIENTOS.md` |
| Prompts | `.github/prompts/RPE26-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` y `.vscode/AudiLock.json` |

### Decision RPE26

- RDEP queda como XML oficial SRI porque el repo conserva XSD, manifest y validacion estructural.
- Formulario 107 queda como PDF anual por trabajador basado en roles cerrados y referencia SRI/RDEP.
- IESS no se expone como XML SAE: la PWA muestra `Batch IESS` y `Generar TXT IESS`.
- La fuente IESS revisada documenta archivos batch ASCII `.txt`/`.dat` separados por `;`; SKNOMINA genera MSU.
- El endpoint legado `/api/reportes/sae` se conserva por compatibilidad, pero retorna batch TXT/DAT.
- El establecimiento IESS no tiene fallback hardcodeado: se configura en Datos de empresa > IESS.
- Los planes comerciales monetizan establecimientos con `iess_establecimientos_max` (`-1` = ilimitado).
- Los planes publicos muestran precio base + IVA 15%, total, contado anual, mensualidades y tasa nominal anual desde metadata comercial.
- El catalogo publico de planes rankea por raiz comercial y muestra solo la ultima version vigente, excluyendo versiones `superseded`.
- La landing deja de prometer `XML SAE IESS`; comunica `Batch IESS TXT`.
- Para nominas grandes, los reportes recomendados son verticales: detalle tabular, detalle por concepto y ledger de beneficios. La matriz dinamica queda como uso puntual.

### Gates RPE26

- `node --check backend/src/services/iessSaeGenerator.js`
- `node --check scripts/verify-system-contracts.mjs`
- `npm.cmd --workspace=backend test -- iessSaeGenerator.test.js app.routes.test.js configurationService.test.js paymentController.test.js --runInBand`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npm.cmd run contracts`
- `npm.cmd --workspace=frontend-web run build`
- `git diff --check`

## Closed Haiky Plan - HAIKY-PAYPHONE-CANAL-PRINCIPAL-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-PAYPHONE-CANAL-PRINCIPAL-2026 |
| Codigo | PAY26 |
| Estado | completed-pass |
| Fecha | 2026-07-12 |
| Requerimiento fuente | Revisar regresion donde landing mostraba "Los pagos directos estan deshabilitados..." aunque PayPhone debe ser el canal principal. |
| Informe | `docs2/REGRESION_CANAL_PAGOS_PAYPHONE_2026.md` |

### Reglas PAY26

- `PAYMENT_PROVIDER=payphone` habilita PayPhone por defecto cuando la configuracion real esta completa.
- Transferencia bancaria manual es contingencia explicita: `DIRECT_PAYMENTS_ENABLED=false`, `PAYPHONE_CHECKOUT_ENABLED=false` o `PAYMENT_PROVIDER=manual_transfer`.
- Produccion Render declara `DIRECT_PAYMENTS_ENABLED=true` junto con `PAYMENT_PROVIDER=payphone`.
- Si faltan `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID` o `BACKEND_PUBLIC_URL` HTTPS, bloquear por configuracion PayPhone; no caer silenciosamente a transferencia.

### Gates PAY26

- `npm.cmd --workspace=backend test -- paymentController.test.js --runInBand`
- `npm.cmd run contracts`
- `npm.cmd --workspace=frontend-web run build`

---

## Open Haiky Plan - HAIKY-ASSETS-COMERCIAL-UIUX-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-ASSETS-COMERCIAL-UIUX-2026 |
| Codigo | HAIKY-ASSET |
| Estado | completed-pass |
| Fecha | 2026-07-12 |
| Requerimiento fuente | Revisar LANDING, PWA, BACKEND y MOBILE por regresion de logo, imagen comercial, UI/UX y uso real de assets; definir formatos/tamanos, scripts JS, plan, prompts, AuditLock, gates, commit y push. |
| Plan doc | `docs2/PLAN_HAIKY_ASSETS_COMERCIAL_UIUX_2026.md` |
| Informe | `docs2/auditoria-assets-comercial-haiky-2026/INFORME_DIAGNOSTICO.md` |
| Diagnostico JSON | `docs2/auditoria-assets-comercial-haiky-2026/DIAGNOSTICO_JSON.json` |
| Evidencia visual | `docs2/auditoria-assets-comercial-haiky-2026/evidencia-visual/` |
| Prompts | `.github/prompts/HAIKY-ASSETS-COMERCIAL-2026-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` y `.vscode/AudiLock.json` |

### Hallazgos HAIKY-ASSET

- Regresion confirmada: `frontend-web/public/icon-512.png` y `app-movil/assets/icon.png` mostraban placeholder `Nomina-Ec / datos ficticios`.
- Fuente canonica incorporada: `assets/brand/source/SKNOMINA_LOGO.png`, con hashes en `assets/brand/manifest.json`.
- LANDING/PWA usan `/brand/sknomina-logo-512.png`, `/brand/sknomina-og.png` y screenshots PNG de marca.
- Favicon de pestana corregido: `index.html` usa `favicon-32.png`, `favicon-48.png` y `favicon-64.png` generados desde SKNOMINA; `/icon.svg` ya no es favicon principal.
- MOBILE usa launcher, adaptive icon, notification y splash generados desde la misma fuente.
- Banner de cookies se reduce para no bloquear controles en mobile.
- Header mobile ajustado para mantener logo oficial y evitar overflow horizontal en 390px.

### Scripts HAIKY-ASSET

- `npm.cmd run brand:assets:solution`
- `npm.cmd run audit:brand-assets`
- `npm.cmd run brand:assets:auditlock`
- `npm.cmd --workspace=frontend-web run smoke:pwa`
- `npm.cmd run audit:brand-visual`

Reglas: no reintroducir placeholders de tienda, no aceptar screenshots ficticios como manifest principal, no volver a enlazar `/icon.svg` como favicon de pestana, y no eliminar SVG/legacy hasta confirmar cero referencias productivas con `rg`.

---

## Open Haiky Plan - HAIKY-AUDITORIA-INTEGRAL-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-NOMINA-EC-2026 |
| Codigo | HAIKY26 |
| Estado | completed-pass |
| Fecha | 2026-07-12 |
| Requerimiento fuente | Auditoria integral LANDING, PWA, BACKEND y MOBILE; humanizacion, chunking, churn, ortografia, UTF-8, duplicados, codigo muerto, bugs, tablero, homologacion, legal Ecuador 2026, candidatos a eliminacion, scripts JS, prompts, AuditLock, commit y push. |
| Plan doc | `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_NOMINA_EC_2026.md` |
| Informe | `docs2/auditoria-integral-haiky-2026/INFORME_DIAGNOSTICO.md` |
| Diagnostico JSON | `docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_JSON.json` |
| Prompts | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` y `.vscode/AudiLock.json` |

### Reconfirmacion HAIKY26

- SBU Ecuador 2026 queda en USD 482; usuario valida el dato en la pagina del Ministerio del Trabajo. No cambiar sin fuente oficial vigente o aprobacion explicita.
- Alcance juridico, laboral y tributario: Ecuador exclusivamente; Colombia queda fuera de alcance.
- SRI facturacion electronica se trata como integracion fail-closed: firma electronica, autorizacion/validacion SRI, ambiente y facturador externo son dependencias productivas.
- Proteccion de datos personales tiene controles implementados (consentimiento, exportacion, purga, privacidad, GPS/foto), pero exige revision juridica final antes de despliegue comercial amplio.
- Senales `mock`/placeholder en PayPhone, storage y resultado de pago se clasifican como controladas cuando no activan funcionalidad productiva.

### Runtime HAIKY26

- `app-movil/src/App.js` elimina `catch(() => {})` en limpieza de sesion y registra errores estructurados.
- Cambios locales de sesion PWA/mobile se preservan: `authStorage`, login PWA, login mobile, API mobile y cliente autenticado.
- `scripts/haiky-integral-diagnostic.mjs` clasifica hallazgos, senales controladas y vigencia legal.
- `scripts/haiky-integral-solution.mjs` ejecuta diagnostico, contratos, mobile readiness, anti silent failures, UTF-8 y escribe AuditLock canonico/espejo.

### Gates HAIKY26

- `npm.cmd run audit:integral`
- `npm.cmd run haiky:solution`
- `npm.cmd run validate` (PASS: contratos, Prisma, backend 52 suites/296 tests y build PWA)
- `git diff --check` (PASS; solo avisos LF/CRLF esperados en Windows)

Reglas: aplicar `RULES.md`, no reportar falsos positivos sin evidencia, no eliminar codigo sin probar imports/rutas/tests, y no desplegar si los gates detectan regresion.

---

## Open Haiky Plan - HAIKY-USUARIOS-ROLES-RBAC-MODULAR-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-USUARIOS-ROLES-RBAC-MODULAR-SKNOMINA-2026 |
| Codigo | URR26 |
| Estado | completed-pass |
| Fase cerrada | URR26-03 QA release |
| Requerimiento fuente | El campo "Acceso empleado" solo ofrece 3 opciones genericas que no cubren los modulos reales del sistema; los permisos se guardan pero no se aplican. |
| Plan doc | `docs2/PLAN_HAIKY_USUARIOS_ROLES_RBAC_MODULAR_SKNOMINA_2026.md` |
| Prompts | `.github/prompts/URR26-{00..03}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance URR26

URR26 reemplaza el dropdown simplista de "Acceso empleado" (3 opciones cosmeticas) por una matriz de permisos por modulo real del sistema. Los 9 modulos (empleados, asistencia, operacion, nomina, documentos, reportes, parametrizacion, comunicaciones, auditoria) se definen en `backend/src/config/modules.js`, se almacenan como `module_permissions JSONB` en la tabla `usuarios`, y se aplican con middleware `requireModule()` en backend y sidebar dinamico en frontend. Los roles `superadmin` y `owner` mantienen acceso total irrestricto. El campo `employee_access` se reemplaza por la matriz visual de checkboxes en la pestaña "Usuarios y roles" de Parametrizacion.

### Modulos URR26

| Modulo | Codigo | Roles base |
|--------|--------|-----------|
| Empleados | `empleados` | owner, admin_rrhh, supervisor |
| Asistencia | `asistencia` | owner, admin_rrhh, supervisor |
| Operacion | `operacion` | owner, admin_rrhh |
| Nomina | `nomina` | owner, admin_rrhh |
| Documentos | `documentos` | owner, admin_rrhh |
| Reportes | `reportes` | owner, admin_rrhh |
| Parametrizacion | `parametrizacion` | owner, admin_rrhh |
| Comunicaciones | `comunicaciones` | owner, admin_rrhh |
| Auditoria | `auditoria` | owner |

### Gates URR26

- `npm.cmd --workspace=backend test -- app.routes.test.js --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run contracts`
- `git diff --check`
- UTF-8 sin BOM en archivos `.js`, `.jsx`, `.md`, `.json` modificados.

---

## Closed Haiky Plan - HAIKY-COSTOS-PRODUCCION-DOCUMENTOS-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-COSTOS-PRODUCCION-DOCUMENTOS-SKNOMINA-2026 |
| Codigo | CPD26 |
| Estado | completed-pass |
| Fase cerrada | CPD26-03 QA release |
| Requerimiento fuente | Llegar a produccion con costos controlados, sin AWS obligatorio y con documentos generados/descargados solo por backend API. |
| Plan doc | `docs2/PLAN_HAIKY_COSTOS_PRODUCCION_DOCUMENTOS_SKNOMINA_2026.md` |
| Reporte | `docs2/costos-produccion-documentos-sknomina-2026/REPORTE_CPD26_00_03_EJECUCION.md` |
| Prompts | `.github/prompts/CPD26-{00..03}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance CPD26

CPD26 cierra la decision de infraestructura documental de produccion inicial. `sknomina-api` queda como unico servicio que genera y descarga documentos; `render.yaml` monta disco persistente en `/var/data`, usa `STORAGE_DRIVER=local`, escribe en `/var/data/sknomina-documents` y publica descargas con `https://api.sknomina.com`. El worker `sknomina-worker-cron` queda fuera del blueprint inicial para reducir costo y evitar calculos automaticos no revisados.

### Decisiones CPD26

- Roles PDF y archivos bancarios se generan bajo demanda por endpoints del backend API.
- El cron actual no genera documentos descargables; opera novedades por faltas, calculo mensual automatico, limpieza de sesiones, alerta de decimos y purga LOPDP.
- Produccion inicial prioriza operacion manual y auditable desde PWA.
- S3/R2 queda como opcion futura cuando exista storage compartido o multiples servicios/instancias.
- Render Persistent Disk tiene alcance de un servicio/instancia; no se debe reintroducir worker documental con storage local.

### Gates CPD26

- `node --check scripts/verify-system-contracts.mjs`
- `npm.cmd run contracts`
- `git diff --check`
- UTF-8 sin BOM en archivos `.js`, `.md`, `.json` y `.yaml` modificados.

## Open Haiky Plan - HAIKY-GESTION-PERIODOS-ANUALES-NOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-GESTION-PERIODOS-ANUALES-NOMINA-2026 |
| Codigo | GPA26 |
| Estado | completed-pass |
| Fase actual | GPA26-04 QA release |
| Requerimiento fuente | Mejorar manejo de periodos: pantalla para generar periodos anuales y mensuales con fecha desde/hasta, apertura/cierre e integridad de calculos. |
| Plan doc | `docs2/PLAN_HAIKY_GESTION_PERIODOS_ANUALES_NOMINA_2026.md` |
| Reporte | `docs2/gestion-periodos-anuales-nomina-2026/REPORTE_GPA26_00_04_EJECUCION.md` |
| Prompts | `.github/prompts/GPA26-{00..04}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance GPA26

GPA26 agrega gobierno operativo de periodos de nomina. `payroll_periods` conserva la clave por tenant/anio/mes y agrega `fecha_desde` y `fecha_hasta`. La PWA expone `Nomina > Periodos` para generar los doce meses del anio, abrir meses y cerrar operativamente cuando no existan roles borrador ni novedades pendientes. Los periodos calculados no se cierran por esta via: deben cerrarse desde el flujo de cierre de nomina para preservar roles y beneficios.

### Gates GPA26 ejecutados

- `node --check` en servicios/controlador backend modificados: PASS.
- `npm.cmd --workspace=backend test -- monthlyPeriodService.test.js app.routes.test.js --runInBand`: PASS, 2 suites y 36 tests.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd run contracts`: PASS.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `git diff --check`: PASS.
- UTF-8 sin BOM en archivos `.js`, `.md` y `.json` modificados: PASS.

## Closed Haiky Plan - HAIKY-ASSETS-ICONOGRAFIA-SISTEMA-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-ASSETS-ICONOGRAFIA-SISTEMA-SKNOMINA-2026 |
| Codigo | AIS26 |
| Estado | completed-pass |
| Fase cerrada | AIS26-04 QA y cierre |
| Requerimiento fuente | "El uso de assets es bajo, el icono de la app no despliega la imagen del sistema, se expone crudo" |
| Plan doc | `docs2/PLAN_HAIKY_ASSETS_ICONOGRAFIA_SISTEMA_SKNOMINA_2026.md` |
| Reporte | `docs2/assets-iconografia-sistema-sknomina-2026/REPORTE_AIS26_00_04_EJECUCION.md` |
| Prompts | `.github/prompts/AIS26-{00..04}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance AIS26

AIS26 cierra la brecha de iconografia de sistema sin crear marca paralela. La PWA usa el icono SKNOMINA en HTML, manifest, shortcuts, apple touch y metadatos sociales; `BrandLogo` renderiza `/icon-512.png` con fallback `/icon.svg`; Expo declara icono y adaptive icon, configura splash mediante `expo-splash-screen`, conserva el asset `notification-icon.png` sin usar `expo.notification`, y el login movil muestra el icono real dentro de la experiencia.

### Hallazgos AIS26

| ID | Severidad | Hallazgo | Resolucion |
|----|-----------|----------|------------|
| AIS26-F01 | ALTO | `icon-192.png` no media 192x192 | Regenerado a 192x192 desde fuente de sistema |
| AIS26-F02 | MEDIO | `icon-512.png` no media 512x512 | Regenerado a 512x512 |
| AIS26-F03 | ALTO | HTML no exponia PNG fallback ni apple touch | `index.html` enlaza `icon.svg`, `icon-192.png`, `apple-touch-icon.png` y manifest |
| AIS26-F04 | MEDIO | Metadatos sociales usaban screenshot SVG | OG/Twitter usan `icon-512.png` |
| AIS26-F05 | ALTO | Expo no configuraba splash moderno aunque existian assets | `app.json` usa plugin `expo-splash-screen` y mantiene `notification-icon.png` como asset |
| AIS26-F06 | MEDIO | Login movil mostraba solo texto de marca | `LoginScreen` renderiza `assets/icon.png` con `Image` |
| AIS26-F07 | ALTO | No habia contrato anti-regresion de iconografia | `contracts`, `smoke:pwa` y `check:mobile` validan rutas y dimensiones |

### Gates AIS26

- `npm.cmd run contracts`
- `npm.cmd run build:web`
- `npm.cmd --workspace=frontend-web run smoke:pwa`
- `npm.cmd run check:mobile`
- `git diff --check`
- UTF-8 sin BOM para archivos `.js`, `.mjs`, `.json` y `.md` modificados.

### Controles AIS26

- No se tocan prompts `MDS26-*` no relacionados que existen sin seguimiento.
- `MDS26` queda preservado como precedente en `AuditLock.json`; AIS26 no ejecuta ni cancela ese plan.
- No se cambia API publica, rutas de autenticacion ni contratos backend.

## Open Haiky Plan - HAIKY-MENSUALIZACION-DECIMOS-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-MENSUALIZACION-DECIMOS-SKNOMINA-2026 |
| Codigo | MDS26 |
| Estado | completed-pass |
| Fase actual | MDS26-05 QA release (cerrada) |
| Fecha cierre | 2026-07-05 |
| Requerimiento fuente | Codigo del Trabajo Ecuador Arts. 111, 113: el trabajador puede solicitar mensualizacion de decimo tercero y cuarto. Sistema actual solo implementa fondo de reserva mensual; decimos solo se provisionan. |
| Plan doc | `docs2/PLAN_HAIKY_MENSUALIZACION_DECIMOS_SKNOMINA_2026.md` |
| Reporte | `docs2/mensualizacion-decimos-sknomina-2026/REPORTE_MDS26_00_05_EJECUCION.md` |
| Prompts | `.github/prompts/MDS26-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance MDS26

MDS26 implementa la eleccion del trabajador para mensualizar decimo tercero y decimo cuarto sueldo, replicando el patron existente de fondo de reserva mensual. Los campos `modalidad_decimo_tercero` y `modalidad_decimo_cuarto` se agregan al modelo de empleados con valores `mensual` o `acumulado` (default `acumulado`). El motor de nomina, frontend, reportes y contabilidad reflejan la modalidad elegida.

### Hallazgos MDS26

| ID | Severidad | Hallazgo | Fase |
|----|-----------|----------|------|
| MDS26-F01 | ALTO | No existe campo modalidad_decimo_tercero en empleados | 01 |
| MDS26-F02 | ALTO | No existe campo modalidad_decimo_cuarto en empleados | 01 |
| MDS26-F03 | ALTO | Motor de nomina no ofrece mensualizacion de decimo tercero | 02 |
| MDS26-F04 | ALTO | Motor de nomina no ofrece mensualizacion de decimo cuarto | 02 |
| MDS26-F05 | MEDIO | Frontend no permite elegir modalidad decimo tercero | 03 |
| MDS26-F06 | MEDIO | Frontend no permite elegir modalidad decimo cuarto | 03 |
| MDS26-F07 | MEDIO | Reportes no reflejan modalidad de decimos | 04 |
| MDS26-F08 | MEDIO | Detalle de calculo no incluye montos mensualizados como ingreso | 02 |

### Fases MDS26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| MDS26-00 | P0 | completed | Plan, prompts, contexto y AuditLock baseline. |
| MDS26-01 | P0 | completed | Campos modalidad decimos en modelo empleado. |
| MDS26-02 | P0 | completed | Motor nomina mensualizacion decimos. |
| MDS26-03 | P1 | completed | Frontend formulario empleado y detalle nomina. |
| MDS26-04 | P1 | completed | Reportes, contabilidad y PDF con modalidad. |
| MDS26-05 | P0 | completed-pass | QA, tests, build, contracts, AuditLock cierre. |

### Reglas MDS26

- Aplicar `RULES.md` en cada archivo `.js`, `.md` y `.json`.
- No cambiar calculo de provision existente; solo agregar ingreso mensual cuando modalidad = `mensual`.
- Default `acumulado` = comportamiento actual sin regresion.
- Replicar patron de fondo de reserva mensual para decimos.
- Ingreso mensualizado NO afecta IESS; SI suma a total ingresos y neto.

---

## Closed Haiky Plan - HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-SKNOMINA-2026 |
| Codigo | AISK26 |
| Estado | completed-pass |
| Fase actual | AISK26-10 (cerrada) |
| Fecha cierre | 2026-07-04 |
| Plan doc | `docs2/auditoria-integral-sknomina-2026/PLAN_HAIKY_AUDITORIA_INTEGRAL_SKNOMINA_2026.md` |
| Reporte | `docs2/auditoria-integral-sknomina-2026/REPORTE_AISK26_EJECUCION.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Resultado AISK26

Auditoria integral completada. 45 hallazgos (4 ALTO, 25 MEDIO, 16 BAJO) — todos resueltos en 10 fases. Tests 234/234 PASS, contracts PASS, build PASS. Cambios en RBAC, ortografia UTF-8, timezone Ecuador, DRY, movilizacion mejorada con anticipo, autoservicio PDF y permisos, SQLite offline (cola+cache+perfil), UI/UX humanizacion (dark mode, ErrorBoundary, tabs), legal Ecuador 2025/2026, PayPhone healthCheck, purga LOPDP y seed password hardening.

---

## Closed Haiky Plan - HAIKY-MONETIZACION-RUTAS-APP-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-MONETIZACION-RUTAS-APP-SKNOMINA-2026 |
| Codigo | MRA26 |
| Estado | MRA26-00 a MRA26-03 ejecutadas localmente; QA verde con salvedad de cierre manual de Vite |
| Fase actual | completed |
| Requerimiento fuente | Rutas y app deben tener canal de monetizacion en Gestion de planes para que solo los planes que los ofrecen concedan acceso. |
| Plan doc | `docs/PLAN_HAIKY_MONETIZACION_RUTAS_APP_SKNOMINA_2026.md` |
| Reporte | `docs/monetizacion-rutas-app-sknomina-2026/REPORTE_MRA26_00_03_CIERRE_RUNTIME.md` |
| Prompts | `.github/prompts/MRA26-00-baseline-documental.md` a `.github/prompts/MRA26-03-qa-release.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance MRA26

MRA26 convierte App movil y Rutas de campo en capacidades comerciales explicitas. `planes_comerciales` agrega `app_movil` y `rutas_campo`; el backend las expone como `mobileApp` y `fieldRoutes`; Gestion de planes permite activarlas; el catalogo publico las comunica; y los endpoints de app/rutas/movilizacion quedan bloqueados por plan cuando el tenant no tiene el canal contratado.

### Decisiones MRA26

- `TRIAL` y `MICRO` habilitan app movil, pero no rutas de campo.
- `PYME`, `EMPRESA` y `CORPORATIVO` habilitan app movil y rutas de campo.
- Las rutas dentro de la app movil exigen ambos canales: `mobileApp` y `fieldRoutes`.
- El plan demo comercial queda con ambos canales habilitados.
- Los planes editados con suscripciones activas conservan versionado comercial para no mutar contratos previos.

### Gates MRA26

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- planCapabilityService.test.js app.routes.test.js paymentController.test.js --runInBand`: PASS, 3 suites y 13 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS funcional; Vite genero artefactos y reporto `built in 10.22s`, luego el proceso no libero prompt y se cerro por PID.
- `npm.cmd run check:mobile`: PASS.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.
- UTF-8 sin BOM: PASS, 28 archivos modificados o nuevos verificados.

---

## Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026 |
| Codigo | DPS26 |
| Estado | DPS26-01 a DPS26-10 ejecutadas localmente; QA verde; commit final en curso |
| Fase actual | DPS26-10 qa-release |
| Requerimiento fuente | Diagnostico preliminar de SINKRONET-SAS/nomina-ec sobre cumplimiento laboral Ecuador 2026, tributario, motor de nomina, inmutabilidad, seguridad, PWA, app movil, reportes y mantenimiento. |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_DIAGNOSTICO_PRELIMINAR_SKNOMINA_2026.md` |
| Matriz | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/MATRIZ_DPS26_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/CONTRATO_DPS26_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/RUNBOOK_DPS26_QA_RELEASE.md` |
| Baseline | `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/REPORTE_DPS26_00_BASELINE.md` |
| Prompts | `.github/prompts/DPS26-{00..10}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance DPS26

DPS26 transforma el diagnostico preliminar en un cierre por fases del producto completo: backend, PWA, app movil, landing, planes, reportes, documentacion y despliegue. El foco P0 es que las promesas de cumplimiento Ecuador 2026 no queden como texto comercial sin evidencia ejecutable.

### Promesa P0 de reportes oficiales

La promesa visible de reportes queda corregida por RPE26: RDEP y Formulario 107 son reportes SRI con fuente versionada; IESS se comunica como prevalidacion operativa hasta contar con formato oficial de carga o guia tecnica aprobada. Los reportes internos deben mantenerse trazables y en formato vertical para nominas grandes.

### Reglas operativas DPS26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- Aplicar `RULES.md` en cada archivo `.js`, `.md` y `.json`.
- No guardar secretos, tokens, URLs privadas, certificados ni credenciales.
- No cambiar parametros legales 2026 sin fuente oficial, prueba y reporte de impacto.
- No prometer ATS como reporte de nomina productivo sin confirmar alcance real.
- Todo bloqueo legal, tributario, tenant, seguridad, PWA o app movil debe quedar visible con lenguaje comercial normal.
- Cada fase runtime debe cerrar con pruebas, reporte y `AuditLock.json` firmado.

### Cambios locales previos reforzados

Antes de DPS26 habia cambios runtime locales no commiteados que reforzaban el plan. DPS26-01 a DPS26-10 los contrasto contra el repo real, descarto ruido y los cerro con pruebas:

- Fundador/superadmin con tenant operativo: seed, middleware RBAC, utilidades de acceso, dashboard y menu.
- Planes y landing: catalogo publico compartido, presentacion comercial de planes, precios visibles en landing y gestion superadmin.
- Login/rutas/pago: enlaces de Planes, Sitio publico y Resultado de pago.
- Readiness operativo: responsables y tests asociados.

DPS26-05, DPS26-06, DPS26-07 y DPS26-10 reforzaron estos cambios con pruebas antes de commit.

### Fases DPS26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| DPS26-00 | P0 | completed_documental | Plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| DPS26-01 | P0 | completed_local | Contraste README, landing, PWA, app y backend contra codigo real. |
| DPS26-02 | P0 | completed_local | Matriz laboral Ecuador 2026. |
| DPS26-03 | P0 | completed_local | Motor de nomina trazable e inmutable. |
| DPS26-04 | P0 | completed_local | Cumplimiento tributario aplicable. |
| DPS26-05 | P0 | completed_local | Inmutabilidad, auditoria, RLS, tenant, cifrado, JWT y logs. |
| DPS26-06 | P1 | completed_local | Paridad comercial, landing, planes, PWA y app. |
| DPS26-07 | P1 | completed_local | Flujos PWA criticos. |
| DPS26-08 | P1 | completed_local | App movil GPS/foto, privacidad y stores. |
| DPS26-09 | P0 | superseded_by_RPE26 | RDEP, Formulario 107 PDF, batch IESS TXT y reportes internos trazables. |
| DPS26-10 | P0 | completed_local | QA final, dependencias, observabilidad, docs, AuditLock y release. |

---

## Open Haiky Plan - HAIKY-CIERRE-APK-AAB-SKNOMINA-2026-V5

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-APK-AAB-SKNOMINA-2026-V5 |
| Codigo | APK26V5 |
| Estado | Ejecutado localmente; QA verde |
| Fase actual | APK26V5-04 QA release |
| Fuente auditoria | `C:\Users\proam\Downloads\files (2)\informe_auditoria_nomina_ec_v5.md` |
| Plan local | `docs2/PLAN_HAIKY_CIERRE_APK_AAB_SKNOMINA_2026_V5.md` |
| Prompts | `.github/prompts/APK26V5-{00..04}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance APK26V5

APK26V5 cierra los hallazgos vivos del informe v5: reduccion real de `Parametrizacion.jsx`, ortografia visible en empleados y gobierno de `docs2/` en repo publico. El plan se genero localmente en `docs2`, pero `docs2/` queda excluido del tracking porque HAL-V5-5 lo clasifica como exposicion critica persistente.

### Decisiones APK26V5

- No tocar `calculoNominaService.js`; la auditoria lo verifico correcto.
- No cambiar payloads ni contrato de parametros legales/tabla IR.
- `Parametrizacion.jsx` baja de 1949 a 861 lineas con extraccion de modelo a `parametrizacionModel.jsx`.
- `docs2/` pasa a evidencia local no versionada; la trazabilidad publica minima queda en `.github`, prompts y AuditLock.
- "Mi Nomina" no se reemplaza por SKNOMINA; solo se corrige ortografia visible cuando aplique.

### Gates APK26V5

- `.\node_modules\.bin\vite.cmd build` en `frontend-web`: PASS, Vite genero `dist` y emitio `built in 1m 4s`; el proceso post-build no libero el prompt y se cerro por PID tras salida verde.
- `npm.cmd --workspace=backend test -- authController.test.js --runInBand`: PASS, 1 suite y 5 tests.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.
- `git ls-files docs2/ | Measure-Object -Line`: PASS, 0 archivos.

---

## Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V6-SINKFLOW

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V6-SINKFLOW |
| Codigo | CDANV6S |
| Estado | Ejecutado localmente; QA especifica verde |
| Fase actual | CDANV6S-05 QA release |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V6.jsx` |
| Scripts | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v6_scripts.jsx` |
| Hallazgos | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v6_hallazgos.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_SKNOMINA_2026_V6_SINKFLOW.md` |
| Matriz | `docs2/cierre-definitivo-auditoria-sknomina-2026-v6-sinkflow/MATRIZ_CDANV6S_HALLAZGOS.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-sknomina-2026-v6-sinkflow/RUNBOOK_CDANV6S_QA_RELEASE.md` |
| Prompts | `.github/prompts/CDANV6S-{00..05}-*.md` |

### Alcance CDANV6S

CDANV6S contrasta la auditoria V6 de `sinkroniq-cloud-flow` contra el runtime actual de `nuevo_nomina`. La lectura directa confirma que los hallazgos citados como criticos ya estan cerrados o cubiertos por contratos equivalentes en este repo: Render ejecuta `seed:admins`, PayPhone tiene variables productivas declaradas, rol PDF tiene ruta/controlador/servicio, email de rol usa `sendRolPagoDisponible`, mobile tiene permisos y movilizacion SQLite.

### Decisiones CDANV6S

- No aplicar scripts externos literalmente si contradicen el repo real.
- `sendRolPagoDisponible` es el contrato activo para notificar rol de pago; no se crea `sendRolPagoEmail` solo por nombre.
- `generatePayrollRolePdf` es el contrato activo para PDF individual; no se crea `generarRolPagoIndividual` solo por nombre.
- "Mi Nomina" es etiqueta funcional; no se cambia a SKNOMINA, salvo correccion ortografica a "Mi Nomina" con tilde en runtime activo cuando corresponda.
- NOMINA-EC no debe reintroducirse como marca activa; SKNOMINA es la marca del producto.

### Gates CDANV6S esperados

- `npm.cmd --workspace=backend test -- app.routes.test.js nominaController.test.js communicationService.test.js payrollRolePdfService.test.js mobileController.test.js --runInBand`: PASS, 5 suites y 23 tests.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd run check:mobile`: PASS.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.

---

## Open Haiky Plan - HAIKY-CIERRE-APK-AAB-SKNOMINA-2026-V4

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-APK-AAB-SKNOMINA-2026-V4 |
| Codigo | APK26V4 |
| Estado | Ejecutado localmente; QA en curso |
| Fase actual | APK26V4-05 QA release |
| Fuente auditoria | `C:\Users\proam\Downloads\files (2)\informe_auditoria_nomina_ec_v4.md` |
| Checklist | `C:\Users\proam\Downloads\files (2)\apk_aab_checklist_v4.js` |
| Fixes | `C:\Users\proam\Downloads\files (2)\fix_n1_*.js` a `fix_n5_*.js` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_APK_AAB_SKNOMINA_2026_V4.md` |
| Matriz | `docs2/cierre-apk-aab-sknomina-2026-v4/MATRIZ_APK26V4_HALLAZGOS.md` |
| Runbook | `docs2/cierre-apk-aab-sknomina-2026-v4/RUNBOOK_APK26V4_QA_RELEASE.md` |
| Prompts | `.github/prompts/APK26V4-{00..05}-*.md` |

### Decisiones APK26V4

- HAL-N1: `app-movil/app.json` declara `android.targetSdkVersion: 35`; `check-store-readiness.mjs` falla si el target baja de 35.
- HAL-N2: `extractApiError` es deduplicacion cosmetica de mensajes UI. No afecta facturacion fiscal, XML, IVA, firma, SRI ni el cliente server-to-server.
- HAL-N3: no se elimina el gobierno Haiky pedido en `docs2`; se retiran del tracking anexos binarios sensibles ya cubiertos por `.gitignore`.
- HAL-N4: cerrado previo; `App.jsx` ya alinea saldos iniciales y facturacion con los roles backend.
- HAL-N5: `sourceStatus` queda `validado_parcial`; `validatedFields` y `pendingValidation` permanecen separados.
- SINKRONET FACTURADOR conserva toda la complejidad fiscal; SKNOMINA observa, reintenta y registra estados.

### Validacion esperada APK26V4

- `npm.cmd run check:mobile`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd --workspace=backend test -- paymentController.test.js --runInBand`
- `git diff --check`

---

## Open Haiky Plan - HAIKY-CIERRE-APK-AAB-SUPERADMIN-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-APK-AAB-SUPERADMIN-SKNOMINA-2026 |
| Codigo | APK26 |
| Estado | APK26-01..09 ejecutadas localmente; QA verde |
| Fase actual | APK26-09 cierre QA release |
| Fuente auditoria | `C:\Users\proam\Downloads\files (7)\informe_auditoria_nomina_ec_v3.md` |
| Fixes fuente | `C:\Users\proam\Downloads\files (7)\fix_1_*.js` a `fix_9_*.js` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_APK_AAB_SUPERADMIN_SKNOMINA_2026.md` |
| Matriz | `docs2/cierre-apk-aab-superadmin-sknomina-2026/MATRIZ_APK26_HALLAZGOS.md` |
| Contrato | `docs2/cierre-apk-aab-superadmin-sknomina-2026/CONTRATO_APK26_CIERRE_PLAY_SUPERADMIN.md` |
| Runbook | `docs2/cierre-apk-aab-superadmin-sknomina-2026/RUNBOOK_APK26_QA_RELEASE.md` |
| Prompts | `.github/prompts/APK26-{00..09}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Decisiones APK26

- HAL-1 queda reclasificado: Expo SDK 54 usa Android `targetSdkVersion` 36 segun documentacion oficial; Google Play exige API 35+ desde 2025-08-31. No se fuerza upgrade a SDK 56 en este cierre.
- Expo Doctor rechaza `android.privacyPolicyUrl`; la URL de privacidad Android queda en `extra.androidPrivacyPolicyUrl` y se valida con `check:mobile`.
- `Superadmin.jsx` ya no es wrapper de `PlanesGestion`: ahora tiene consola fundador con vision general, empresas, incidencias y tab de planes.
- Mobile consume `/mobile/me` y diferencia rol empleado vs owner/admin_rrhh/superadmin.
- `sourceStatus` legal permanece `pendiente_validacion_oficial` hasta fuente versionada oficial completa; se agregan `validatedFields`, `pendingValidation` y `validationSources`.
- `docs2/` y `.vscode/AuditLock.json` se mantienen por trazabilidad Haiky; `.gitignore` bloquea anexos locales/privados y binarios sensibles futuros.

### Validacion APK26

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- --runInBand`: PASS, 51 suites, 212 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `npm.cmd run check:mobile`: PASS.
- `npx.cmd expo-doctor` en `app-movil`: PASS, 18/18 checks.
- `git diff --check`: PASS con avisos CRLF esperados en Windows.

---

## Open Haiky Plan - HAIKY-MIGRACION-SALDOS-INICIALES-FACTURACION-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-MIGRACION-SALDOS-INICIALES-FACTURACION-SKNOMINA-2026 |
| Codigo | MSF26 |
| Estado | MSF26-01..08 ejecutadas localmente; QA verde |
| Fase actual | MSF26-08 cierre QA release |
| Requerimiento fuente | Carga de saldos iniciales para nuevos clientes y facturacion tributaria usando SINKRONET FACTURADOR alojado en Render. |
| Repo facturador consultivo | `C:\proyectos web\sinkroniq-mobile` |
| Plan doc | `docs2/PLAN_HAIKY_MIGRACION_SALDOS_INICIALES_FACTURACION_SKNOMINA_2026.md` |
| Matriz | `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/MATRIZ_MSF26_REQUERIMIENTOS.md` |
| Contrato | `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/CONTRATO_MSF26_MIGRACION_FACTURACION.md` |
| Runbook | `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/RUNBOOK_MSF26_QA_RELEASE.md` |
| Baseline | `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/REPORTE_MSF26_00_BASELINE.md` |
| Prompts | `.github/prompts/MSF26-{00..08}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance MSF26

MSF26 cierra dos brechas comerciales: onboarding de clientes nuevos mediante carga de saldos iniciales y facturacion fiscal de servicios SKNOMINA delegada a SINKRONET FACTURADOR. La carga de saldos debe operar con lote, staging, dry-run, errores por fila, aprobacion, reversa, auditoria y PWA visible. La facturacion debe operar por contrato API server-to-server, idempotencia, readiness fail-closed, webhook firmado y UI de estado fiscal.

### Runtime MSF26

- Saldos iniciales: migracion `20260628143000_msf26_initial_balances_fiscal_billing`, servicio `initialBalanceService`, controlador `initialBalanceController` y PWA `/dashboard/onboarding/saldos-iniciales`.
- Plantillas: CSV/XLSX versionadas `MSF26-v1` con catalogo de saldos, ejemplo y descarga desde PWA.
- Dry-run/commit/reversa: lote con hash, errores por fila, bloqueo de periodos cerrados, auditoria y `requireFreshUser` en acciones sensibles.
- Motor nomina: lee saldos `committed` como ajustes iniciales en periodos abiertos y deja evidencia en `detalle_calculo.saldosIniciales`.
- Facturacion: cliente `facturadorClient`, servicio `fiscalInvoiceService`, controlador `fiscalBillingController` y PWA `/dashboard/facturacion`.
- Payphone: al aprobar pago se activa suscripcion y se encola solicitud fiscal idempotente sin romper el pago si el facturador esta bloqueado.
- Webhook fiscal: `POST /api/facturacion/webhook/facturador` con firma HMAC SHA-256 y cuerpo crudo de Express.

### Validacion MSF26

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- --runInBand`: PASS, 51 suites, 212 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `npm.cmd run check:mobile`: PASS.
- `.\node_modules\.bin\prisma.cmd migrate deploy --schema prisma\schema.prisma`: PASS en PostgreSQL local `plan_haiky`.
- UTF-8 sin BOM: PASS.
- `git diff --check`: PASS con avisos CRLF esperados en Windows.

### Evidencia consultiva MSF26

- `C:\proyectos web\sinkroniq-mobile\app.json` identifica la aplicacion como `Sinkronet Facturador`.
- `backend/package.json` declara `Backend Facturacion Electronica Ecuador - Sinkronet`.
- `backend/src/index.js` expone `/api/facturas`, `/api/comprobantes`, `/api/secuenciales` y `/api/health`.
- Existen servicios de XML, XSD, firma, worker y colas de factura; MSF26 debe integrarse por API, no por copia de codigo ni acceso directo a base.

### Reglas MSF26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No emitir facturas reales ni llamar Render productivo en fase documental o diagnostica.
- No guardar secretos, tokens, URLs privadas, certificados ni credenciales en repo.
- No recalcular ni modificar periodos cerrados al cargar saldos iniciales.
- SINKRONET FACTURADOR es la fuente fiscal; SKNOMINA guarda solicitud, estado y referencias.
- Todo bloqueo por facturador, Render, SRI, certificado, perfil fiscal o credenciales debe quedar visible en PWA.
- Cada fase debe cerrar con pruebas, reporte, `AuditLock.json` firmado y commit `phase: MSF26-XX task: ...` cuando se ejecute runtime.

### Fases MSF26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| MSF26-00 | P0 | completed_documental | Plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| MSF26-01 | P0 | completed_local | Diagnostico runtime SKNOMINA y SINKRONET FACTURADOR. |
| MSF26-02 | P0 | completed_local | Modelo de saldos iniciales, staging, plantillas y rollback. |
| MSF26-03 | P0 | completed_local | Carga de saldos con dry-run, commit atomico, reversa y auditoria. |
| MSF26-04 | P0 | completed_local | PWA de onboarding de saldos iniciales. |
| MSF26-05 | P0 | completed_local | Cliente API y readiness hacia SINKRONET FACTURADOR. |
| MSF26-06 | P0 | completed_local | Rutina facturable, cola/reintentos, conciliacion y webhook firmado. |
| MSF26-07 | P1 | completed_local | PWA de facturacion fiscal, documentos, errores y reintentos. |
| MSF26-08 | P0 | completed_local | QA, migraciones, smoke seguro, AuditLock final y release. |

---

## Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V6

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V6 |
| Codigo | CDANV6 |
| Estado | CDANV6-01..09 ejecutadas localmente; QA verde |
| Fase actual | CDANV6-09 cierre QA release |
| Fuente auditoria | `C:\Users\proam\Downloads\files (5)\informe_auditoria_nomina_ec.md` |
| Fixes fuente | `C:\Users\proam\Downloads\files (5)\fix_1_*.js` a `fix_9_*.sh` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026_V6.md` |
| Matriz | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/MATRIZ_CDANV6_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/CONTRATO_CDANV6_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v6/RUNBOOK_CDANV6_QA_RELEASE.md` |
| Prompts | `.github/prompts/CDANV6-{00..09}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance CDANV6

CDANV6 responde a la auditoria integral Nomina-Ec con 9 hallazgos verificados: catalogo de mensajes friendly, reconciliacion XSD RDEP, ortografia UI, logs de produccion, split de Parametrizacion, iconos PWA maskable, aviso LOPDP GPS mobile, calculo de sueldo pendiente en dia 31 y politica de exposicion de `docs2/`/`AuditLock.json`.

### Runtime CDANV6

- Mensajes friendly: `backend/src/config/user-message-catalog.json` queda sin mensajes friendly vacios y con accion siguiente.
- RDEP: `precheckRDEP()` valida hash XSD y manifiesto SRI `checked_2026_06_28`; la PWA muestra la reconciliacion antes de generar XML.
- UI: copy visible corregido en dashboard, reportes, operacion, planes, PWA config y README.
- Logs: `console.log` no operativo removido de `backend/src`, `frontend-web/src` y `app-movil/src`; puntos tocados usan logger estructurado.
- Parametrizacion: helpers/componentes extraidos a `frontend-web/src/pages/Configuracion/parametrizacion/`.
- PWA: PNG maskable 192/512 agregados y manifest generado con `purpose: maskable`.
- Mobile/legal: aviso LOPDP previo a GPS y sueldo pendiente con tope de 30 dias para salida dia 31.
- HAL-9: `docs2/` y `.vscode/AuditLock.json` se mantienen por trazabilidad; se ignoran anexos locales/privados.

### Validacion CDANV6

- `npm.cmd --workspace=backend run rdep:verify-source`: PASS.
- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- --runInBand`: PASS, 49 suites, 204 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `npm.cmd run check:mobile`: PASS.
- UTF-8 sin BOM: PASS, 29 archivos revisados.
- `git diff --check`: PASS con avisos CRLF esperados en Windows.

### Reglas CDANV6

- No iniciar runtime sin aprobacion explicita por fase.
- Aplicar `RULES.md` en cada archivo `.js`, `.md` y `.json`.
- No aplicar los `fix_*` descargados literalmente; contrastarlos contra repo real.
- No crear `CODEX_CONTEXT.md` en raiz; este contexto vive en `.github/CODEX_CONTEXT.md`.
- Mantener este archivo sin secretos, tokens, URLs privadas, usuarios reales o credenciales.
- No cambiar SBU 2026 por esta auditoria: la fuente auditada confirma USD 482.
- RDEP productivo debe fallar cerrado si XSD/catalogo/ficha tecnica SRI no estan reconciliados.
- HAL-9 requiere decision explicita antes de mover, ignorar o retirar `docs2/` y `.vscode/AuditLock.json`.
- Cada fase debe cerrar con pruebas, reporte, `AuditLock.json` firmado y commit `phase: CDANV6-XX task: ...`.

### Fases CDANV6

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CDANV6-00 | P0 | completed_documental | Plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| CDANV6-01 | P0 | completed_local | Diagnostico runtime de los 9 hallazgos. |
| CDANV6-02 | P0 | completed_local | Catalogo de mensajes friendly y consumidores. |
| CDANV6-03 | P0 | completed_local | XSD RDEP, manifest SHA-256 y gate productivo. |
| CDANV6-04 | P1 | completed_local | Ortografia UI y lenguaje comercial visible. |
| CDANV6-05 | P1 | completed_local | Limpieza de logs y logger estructurado. |
| CDANV6-06 | P2 | completed_local | Split controlado de Parametrizacion. |
| CDANV6-07 | P1 | completed_local | Iconos PWA maskable PNG 192/512. |
| CDANV6-08 | P0 | completed_local | Aviso LOPDP GPS y sueldo pendiente dia 31. |
| CDANV6-09 | P0 | completed_local | Gobierno repo publico, QA final, commit y push. |

---

## Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V5

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V5 |
| Codigo | CDANV5 |
| Estado | Ejecutado localmente; QA en curso |
| Fase actual | CDANV5-05 QA release |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V5.jsx` |
| Scripts | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v5_scripts.jsx` |
| Hallazgos | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v5_hallazgos.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_SKNOMINA_2026_V5.md` |
| Matriz | `docs2/cierre-definitivo-auditoria-sknomina-2026-v5/MATRIZ_CDANV5_HALLAZGOS.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-sknomina-2026-v5/RUNBOOK_CDANV5_QA_RELEASE.md` |
| Prompts | `.github/prompts/CDANV5-{00..05}-*.md` |

### Alcance CDANV5

CDANV5 contrasta la auditoria V5 contra el runtime ya corregido por V4 y por planes anteriores. Se descartan los scripts que indican SBU 509, HMAC PayPhone local y LORTI Art. 9 numeral 3 para movilizacion. La ejecucion V5 agrega consolidado anual real en backend/PWA y sugerencia editable de ruta desde domicilio en mobile.

### Decisiones CDANV5

- SBU 2026 operativo: USD 482. No cambiar a USD 509 ni regresar a USD 470.
- PayPhone se valida llamando a Confirmation API (`/api/button/V2/Confirm`); no inventar `x-payphone-signature`.
- Movilizacion/viaticos deben modelarse como ingreso no gravado segun LORTI Art. 9 numeral 11 cuando aplique.
- "Mi Nómina" es etiqueta funcional y se conserva; solo se corrige ortografia si aparece sin tilde.
- NOMINA-EC debe reemplazarse por SKNOMINA en runtime activo de marca/producto, no en evidencias historicas.

### Runtime CDANV5

- `backend/src/services/payrollReportService.js`: `generarConsolidadoAnualNomina`.
- `backend/src/controllers/reporteController.js`: `exportarConsolidadoAnual`.
- `backend/src/app.js`: `GET /api/reportes/nomina/:anio/consolidado`.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx`: boton "Consolidado anual".
- `app-movil/src/screens/GastosMovilizacionScreen.js`: sugerencia origen/destino desde perfil y ruta del dia.

### Gates CDANV5 esperados

- `npm.cmd --workspace=backend test -- app.routes.test.js reporteController.test.js payphoneGatewayService.test.js --runInBand`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- `git diff --check`

---

## Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V4

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-SKNOMINA-2026-V4 |
| Codigo | CDANV4 |
| Estado | Ejecutado localmente; QA especifica backend PASS |
| Fase actual | CDANV4-05 QA release |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V4.jsx` |
| Scripts | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v4_scripts.jsx` |
| Hallazgos | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v4_hallazgos.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_SKNOMINA_2026_V4.md` |
| Matriz | `docs2/cierre-definitivo-auditoria-sknomina-2026-v4/MATRIZ_CDANV4_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-auditoria-sknomina-2026-v4/CONTRATO_CDANV4_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-sknomina-2026-v4/RUNBOOK_CDANV4_QA_RELEASE.md` |
| Prompts | `.github/prompts/CDANV4-{00..05}-*.md` |

### Alcance CDANV4

CDANV4 cierra la auditoria V4 sobre el repo real. Se verifico que rol PDF y `sendRolPagoDisponible()` ya estaban cerrados previamente. Se corrigio el retorno GET de pagos para que no active planes, se agregaron permisos remunerados/no remunerados como novedades pendientes, se expuso historial laboral agrupado en PWA/mobile, se rehizo autoservicio mobile en tres tabs y se reemplazo la marca activa NOMINA-EC por SKNOMINA.

### Decisiones

- “Mi Nómina” es etiqueta funcional de autoservicio y no se cambia a SKNOMINA.
- SKNOMINA es la marca visible del producto, correos, metadatos PWA/mobile, Render, documentos generados y textos legales activos.
- Los planes historicos previos pueden conservar nombres antiguos como evidencia; el runtime activo no debe reintroducir NOMINA-EC.

### Validacion CDANV4

- `npm.cmd --workspace=backend test -- app.routes.test.js mobileController.test.js paymentController.test.js payrollRolePdfService.test.js communicationService.test.js payphoneGatewayService.test.js`: PASS, 6 suites, 22 tests.
- Pendientes antes de push final: `prisma:validate`, `build:web`, `check:mobile`.

---

## Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V3

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V3 |
| Codigo | CDANV3 |
| Estado | CDANV3-00 documental creado; runtime pendiente de aprobacion por fase |
| Fase actual | CDANV3-00 baseline documental |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V3.jsx` |
| Hallazgos | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v3_hallazgos.jsx` |
| Scripts | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v3_scripts.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026_V3.md` |
| Matriz | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/MATRIZ_CDANV3_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/CONTRATO_CDANV3_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/RUNBOOK_CDANV3_QA_RELEASE.md` |
| Prompts | `.github/prompts/CDANV3-{00..10}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Alcance CDANV3

CDANV3 responde a la auditoria Nomina-EC V3. Prioriza pipeline Render con `seed:admins`, webhook Payphone real, JWT con claims, modulo de gastos de movilizacion con SQLite offline, backend y PWA de aprobacion, empresa DEMO con datos smoke, verificacion de roles/reportes, cron de nomina, periodo Ecuador, textos comerciales y limpieza controlada.

### Confirmado como falso positivo o cierre previo

- `superadminController.js` y `superadminService.js` ya existen.
- `payrollReportService.js` ya existe con pdfmake, ExcelJS y S3.
- `seed-superadmin-owner.js` ya existe; la brecha es conectarlo a `render.yaml`.
- Payphone es el canal activo; no cambiar a Stripe ni prometer Stripe incompleto.

### Fases CDANV3

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CDANV3-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| CDANV3-01 | P0 | pending_approval | Diagnostico runtime contra repo actual. |
| CDANV3-02 | P0 | pending_approval | Render ejecuta `seed:admins` de forma segura e idempotente. |
| CDANV3-03 | P0 | pending_approval | Webhook Payphone con validacion, idempotencia y activacion de plan. |
| CDANV3-04 | P0 | pending_approval | JWT con claims y verificacion fresca en operaciones criticas. |
| CDANV3-05 | P0 | pending_approval | SQLite y pantalla mobile de gastos de movilizacion. |
| CDANV3-06 | P0 | pending_approval | Backend de informes de movilizacion, aprobacion/rechazo y anticipo. |
| CDANV3-07 | P0 | pending_approval | PWA de aprobacion y empresa DEMO con datos smoke. |
| CDANV3-08 | P1 | pending_approval | Reportes, cron, periodo Ecuador y UX comercial. |
| CDANV3-09 | P1 | pending_approval | Limpieza controlada de duplicidad y candidatos sin uso. |
| CDANV3-10 | P0 | pending_approval | QA, release gate, AuditLock final, commit y push. |

### Reglas CDANV3

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- Aplicar `RULES.md` en cada archivo `.js`, `.md` y `.json`.
- No crear `CODEX_CONTEXT.md` en raiz; este contexto vive en `.github/CODEX_CONTEXT.md`.
- No hardcodear secretos ni datos reales.
- Payphone debe fallar cerrado si no valida pago, monto, tenant, plan o correlacion.
- Movilizacion debe quedar visible en mobile/PWA y operar con DEMO smoke.
- Cada fase requiere pruebas, reporte, `AuditLock.json` firmado y commit `phase: CDANV3-XX task: ...`.

---

## Open Haiky Plan - HAIKY-AUDITORIA-NOMINA-EC-2026-V2

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-NOMINA-EC-2026-V2 |
| Codigo | ANV2 |
| Estado | ANV2-00..06 ejecutadas localmente; QA verde |
| Fase actual | ANV2-06 QA y release local |
| Alcance | emails reales, timezone America/Guayaquil y firmas legales en documentos laborales generados |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V2.jsx`, `src/pages/v_nominaec/nominaec_v2_scripts.jsx`, `src/pages/v_nominaec/nominaec_v2_hallazgos.jsx` |
| Plan doc | `docs2/PLAN_HAIKY_AUDITORIA_NOMINA_EC_2026_V2.md` |
| Matriz | `docs2/auditoria-nomina-ec-2026-v2/MATRIZ_ANV2_HALLAZGOS.md` |
| Contrato | `docs2/auditoria-nomina-ec-2026-v2/CONTRATO_ANV2_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/auditoria-nomina-ec-2026-v2/RUNBOOK_ANV2_QA_RELEASE.md` |
| Prompts | `.github/prompts/AUDITORIA-NOMINA-EC-2026-V2-{00..06}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

### Resumen ANV2

ANV2 respondio a la auditoria V2. Se reconciliaron cuatro falsos positivos de V1 y se cerraron tres hallazgos P0: EMAIL-C01 con proveedor/modo de comunicaciones real y bloqueo productivo, TZ-C01 con defaults America/Guayaquil y LEG-H01 con firmas de representante legal/delegado y trabajador en documentos laborales.

ANV2 conserva la decision ANV1 de no reintroducir `CODEX_CONTEXT.md` sensible en raiz; el contexto operativo vive en `.github/CODEX_CONTEXT.md`.

### Ejecucion ANV2

- EMAIL-C01: `communicationService` expone `deliveryMode`, `devMode`, `productionBlocked` y falla cerrado en produccion sin SMTP real. `.env.example` y `render.yaml` declaran proveedor, modo dev y proveedor real requerido.
- TZ-C01: PWA usa `currentPeriodEC()` en pantallas de nomina/reportes y backend usa `currentPeriodInEcuador()` para fallback API. El contrato raiz bloquea regresion a `new Date()` local en esas pantallas.
- LEG-H01: roles PDF incluyen recepcion y conformidad; contratos y actas incluyen identificacion del representante legal/delegado y trabajador; PWA muestra estado de firmas.
- Gates: `npm.cmd run contracts` PASS, `npm.cmd run prisma:validate` PASS, `npm.cmd run test:backend` PASS con 44 suites/174 tests, `npm.cmd run build:web` PASS, `npm.cmd --workspace=frontend-web run smoke:pwa` PASS, `npm.cmd run check:mobile` PASS.

### Fases ANV2

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| ANV2-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| ANV2-01 | P0 | completed_local | Diagnostico runtime y evidencia de falsos positivos V1. |
| ANV2-02 | P0 | completed_local | Comunicaciones reales con proveedor, readiness, auditoria y bloqueo productivo sin credenciales. |
| ANV2-03 | P0 | completed_local | Timezone Ecuador para defaults de periodo en web/backend/mobile. |
| ANV2-04 | P0 | completed_local | Firmas legales y datos de representante legal en documentos laborales. |
| ANV2-05 | P1 | completed_local | Frontend operativo para estados de correo, periodo y documentos. |
| ANV2-06 | P0 | completed_local | QA, smoke PWA, AuditLock y release gate. |

### Reglas ANV2

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No prometer emails reales sin proveedor configurado y verificado.
- No usar `new Date()` directo como default operativo de periodo en nomina/reportes.
- No generar documentos laborales finales sin bloque de firmas y datos obligatorios del representante legal.
- Cada fase requiere pruebas, evidencia, AuditLock firmado y commit `phase: ANV2-XX task: ...`.

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

---

## CDAN26 - Cierre definitivo Auditoria Nomina-Ec 2026

Plan: `HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026`.

Estado: CDAN26-00 a CDAN26-08 ejecutadas localmente; gates especificos y build web verdes; gates generales en cierre final.

Artefactos:

- `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026/MATRIZ_CDAN26_HALLAZGOS.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026/CONTRATO_CDAN26_CIERRE_DEFINITIVO.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026/RUNBOOK_CDAN26_QA_RELEASE.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026/REPORTE_CDAN26_01_DIAGNOSTICO_RUNTIME.md` a `REPORTE_CDAN26_08_QA_RELEASE.md`
- `prompts/CDAN26-00-baseline.md` a `prompts/CDAN26-08-qa-release.md`
- `.vscode/AuditLock.json`

Runtime cerrado:

- `calcularMes()` usa cliente transaccional compartido para lote, nominas, lineas normalizadas y estado de `payroll_periods`.
- El motor bloquea sueldo mensual inferior al SBU vigente configurado salvo excepcion legal auditada.
- Fondo de Reserva se conserva por modalidad de empleado `mensual` / `iess_directo`.
- Formulario 107 individual se genera como PDF con precheck, version `FORM107-SRI-2026-CDAN26`, auditoria y UI en Reportes Entidades.
- Novedades permite ingreso manual y carga masiva con plantilla CSV descargable; las novedades por tiempo se expresan como horas redondeadas a 2 decimales en UI/detalle, conservando minutos internamente.
- Cierre de nomina dispara `sendRolPagoDisponible()` y audita cada intento de email.
- Pagos conserva PayPhone como proveedor real existente; `PAYMENT_PROVIDER=stripe` queda bloqueado con mensaje claro si se declara sin implementacion completa.
- Archivo bancario de pago ya no se expone como reporte de entidad ni como accion incrustada en Parametrizacion: la UI tiene pantalla operativa `Nomina > Pagos bancarios`, consume `/api/pagos/banco`, exige banco explicito y usa homologacion/perfil bancario antes de generar.
- `render.yaml` activo mantiene naming Nomina-Ec y variables Stripe no sensibles.

Reglas CDAN26:

- `CODEX_CONTEXT.md` no debe quedar en raiz; el contexto consolidado vive en `.github/CODEX_CONTEXT.md`.
- No prometer validez oficial de Formulario 107 sin revision tributaria profesional.
- SBU 2026 debe tomarse desde parametros legales vigentes del tenant/anio; la matriz interna actual usa USD 482, aunque la auditoria mencionaba USD 460.

---

## CDANV2 - Cierre definitivo Auditoria Nomina-Ec 2026 V2

Plan: `HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V2`.

Estado: CDANV2-08 ejecutado localmente; QA final, commit y push en curso.

Fuentes:

- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V2.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v2_hallazgos.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v2_scripts.jsx`

Artefactos:

- `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026_V2.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/MATRIZ_CDANV2_HALLAZGOS.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/CONTRATO_CDANV2_CIERRE_DEFINITIVO.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/RUNBOOK_CDANV2_QA_RELEASE.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_00_BASELINE.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_01_DIAGNOSTICO_RUNTIME.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_02_AUTH_JWT.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_03_SUPERADMIN_SEED.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_04_ROLES_REPORTES.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_05_CIERRE_MENSUAL.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_06_REVENUE_PAGOS.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_07_LOPDP_UX_PERIODO.md`
- `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/REPORTE_CDANV2_08_QA_RELEASE.md`
- `prompts/CDANV2-00-baseline.md` a `prompts/CDANV2-08-qa-release.md`
- `.vscode/AuditLock.json`

Alcance:

- Auth JWT con claims y verificacion fresca para operaciones criticas.
- Superadmin y seed inicial seguro.
- Roles PDF y reportes de nomina sin 500/404.
- Cierre mensual idempotente con control de carrera.
- Revenue Stripe solo si webhook firmado esta completo; PayPhone se preserva.
- LOPDP para auditoria de comunicaciones, UX, ortografia, periodo Ecuador y QA.

Regla SBU 2026:

- `SEC-V2-01` queda como falso positivo controlado.
- No cambiar SBU 2026 a USD 470.
- Valor operativo actual: USD 482, sujeto a fuente oficial versionada y revision legal antes de cualquier cambio productivo.

Reglas operativas CDANV2:

- Runtime ejecutado por solicitud explicita del usuario: "Ejecutar todos los prompts de PLAN_HAIKY_CIERRE_DEFINITIVO_AUDITORIA_NOMINA_EC_2026_V2.md, y su CODEX_CONTEXT.md".
- No crear `CODEX_CONTEXT.md` en raiz; este contexto vive en `.github/CODEX_CONTEXT.md`.
- No eliminar `docs2`; es gobierno activo de planes Haiky.
- No aplicar scripts fuente literalmente si contradicen el estado runtime real.

Cierre ejecutado CDANV2:

- `SEC-V2-02`: `backend/src/middleware/auth.js` usa claims JWT para requests normales, fallback de tokens legados y `requireFreshUser` para operaciones sensibles.
- `BUG-V2-03`: `backend/src/controllers/nominaController.js` bloquea el periodo con `SELECT ... FOR UPDATE` y cierra roles/beneficios/periodo en una transaccion.
- `LEG-V2-05`: `backend/src/services/communicationAuditService.js` y `backend/scripts/purge-communication-events.js` agregan purga de eventos vencidos por `retention_until`; script `privacy:purge-communications`.
- `UX-V2-02`: `app-movil/src/screens/AutoservicioScreen.js` usa `Intl.NumberFormat('es-EC', currency: 'USD')`.
- Superadmin, seed, Roles PDF, PayPhone/Stripe bloqueado y reportes quedan cerrados por evidencia previa sin duplicar implementacion.
---

## DPS26 - Cierre definitivo diagnostico preliminar SKNOMINA 2026

Plan: `HAIKY-CIERRE-DEFINITIVO-DIAGNOSTICO-PRELIMINAR-SKNOMINA-2026`.

Estado: DPS26-01 a DPS26-10 ejecutado localmente; commit final preparado.

Artefactos:

- `docs2/PLAN_HAIKY_CIERRE_DEFINITIVO_DIAGNOSTICO_PRELIMINAR_SKNOMINA_2026.md`
- `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/MATRIZ_DPS26_HALLAZGOS.md`
- `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/CONTRATO_DPS26_CIERRE_DEFINITIVO.md`
- `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/RUNBOOK_DPS26_QA_RELEASE.md`
- `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/REPORTE_DPS26_00_BASELINE.md`
- `docs2/cierre-definitivo-diagnostico-preliminar-sknomina-2026/REPORTE_DPS26_01_10_CIERRE_RUNTIME.md`
- `.github/prompts/DPS26-00-baseline-documental.md` a `.github/prompts/DPS26-10-qa-release.md`
- `.vscode/AuditLock.json`

Runtime cerrado:

- Reportes oficiales 2026 reforzados: RDEP mantiene XSD/manifiesto y precheck anual; Formulario 107 PDF usa roles cerrados del ejercicio fiscal y base consistente con RDEP; IESS queda degradado a prevalidacion operativa con XML bloqueado hasta formato oficial validado.
- Reportes internos se conservan como exportaciones trazables por codigo de reporte, filtros, usuario y capability comercial.
- Landing y planes quedan con una sola fuente de verdad de catalogo: `frontend-web/src/components/PublicPlansCatalog.jsx`, usado por landing; `/precios` redirige al ancla publica sin duplicar logica ni checkout.
- Superadmin/fundador conserva tenant operativo, seed, RBAC y acceso a gestion de planes; owners conservan operacion tenant.
- Parametrizacion deduplica tipos de novedad en PWA y separa valores legales de cuentas contables de nomina.
- App movil queda alineada con Expo managed: `android.targetSdkVersion` no se declara en `app.json`; `check-store-readiness` valida SDK compatible y URLs/assets de tienda.

Gates DPS26 ejecutados:

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- --runInBand`: PASS, 51 suites, 222 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `npm.cmd run check:mobile`: PASS.
- `npx.cmd expo-doctor`: PASS, 18/18 checks.
- `git diff --check`: PASS.
- UTF-8 sin BOM de archivos JS/MD/JSON/MJS modificados: PASS.

Riesgo residual DPS26:

- RDEP y Formulario 107 deben validarse por profesional tributario/laboral antes de presentacion oficial real.
- IESS requiere validacion en portal/proceso aplicable y fuente tecnica oficial antes de permitir descargas de carga o XML productivo.

---

## HSH26 - Higiene, sanitizacion y humanizacion 2026

Plan: `HAIKY-HIGIENE-SANITIZACION-HUMANIZACION-2026`.

Estado: HSH26-00 a HSH26-05 ejecutadas localmente; QA verde.

Fuente:

- Solicitud del usuario: "la necesidad de higiene y sanitizacion, revision ortografica, UTF-8, depuracion de mojibake, UI/UX, humanizacion".

Artefactos:

- `docs/higiene-sanitizacion-humanizacion-2026/PLAN_HAIKY_HIGIENE_SANITIZACION_HUMANIZACION_2026.md`
- `docs/higiene-sanitizacion-humanizacion-2026/REPORTE_HSH26_00_05_EJECUCION.md`
- `.github/prompts/HSH26-00-baseline.md` a `.github/prompts/HSH26-05-qa-release.md`
- `.vscode/AuditLock.json`

Runtime cerrado:

- Parametrizacion web queda sin mojibake visible en textos de nomina, parametros, decimos, validacion, calculo y matriz minima.
- Los separadores corruptos historicos en metadatos de registros se reemplazan por guiones simples.
- El escaneo repo-wide de archivos `.js`, `.jsx`, `.json`, `.md`, `.mjs`, `.ts` y `.tsx` queda sin coincidencias de mojibake ni caracteres de reemplazo.

Gates HSH26 ejecutados:

- Escaneo de mojibake en archivos gobernados: PASS.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `git diff --check`: PASS.
- UTF-8 sin BOM de archivos modificados `.js`, `.jsx`, `.json`, `.md` y `.mjs`: PASS.

Reglas operativas HSH26:

- No mezclar con cambios locales previos en backend, Prisma, pagos o capacidades de plan.
- No cambiar contratos publicos de API por correcciones editoriales.
- La revision ortografica historica completa queda fuera del alcance si exige reescritura editorial masiva de textos ASCII existentes.

---

## MGR26 - Mobile gestion de rutas y zonas 2026

Plan: `HAIKY-MOBILE-GESTION-RUTAS-ZONAS-2026`.

Estado: MGR26-00 a MGR26-03 ejecutadas localmente; gates MGR26 verdes.

Fuente:

- Solicitud del usuario: la app movil debe crear zonas de marcacion y rutas de campo, asignar funcionalidad a usuarios con perfil apropiado y no mostrar acciones que el perfil no debe ejecutar.

Artefactos:

- `docs2/PLAN_HAIKY_MOBILE_GESTION_RUTAS_ZONAS_2026.md`
- `docs2/mobile-gestion-rutas-zonas-2026/REPORTE_MGR26_00_03_EJECUCION.md`
- `.github/prompts/MGR26-00-baseline-gobierno.md`
- `.github/prompts/MGR26-01-backend-mobile-admin.md`
- `.github/prompts/MGR26-02-app-movil-perfiles.md`
- `.github/prompts/MGR26-03-qa-cierre.md`
- `.vscode/AuditLock.json`

Runtime MGR26:

- Backend agrega `/api/mobile/admin/rutas/resumen`, `/api/mobile/admin/zonas`, `/api/mobile/admin/rutas/sitios` y `/api/mobile/admin/rutas/dias`.
- Los endpoints moviles administrativos exigen `requireMobileAppPlan` y `requireFieldRoutesPlan`.
- `owner/admin_rrhh` pueden crear zonas y sitios; `owner/admin_rrhh/supervisor` pueden consultar y asignar rutas.
- `routeVisitService.createRouteDay` acepta `source = mobile` preservando default `pwa`.
- App movil agrega `OperacionMovilScreen` y cliente API para `/mobile/admin/...`.
- La UI movil usa `allowedActions` para ocultar secciones no autorizadas; no deja controles visibles deshabilitados por perfil.
- `superadmin` no opera tenant desde app movil; se guia a PWA.
- `backend/.env.example` incluye placeholders seguros `SINKRONET_FACTURADOR_*` por instruccion explicita del usuario.

Reglas operativas MGR26:

- No duplicar modelos de zonas/rutas.
- No crear migraciones mientras `work_zones`, `route_sites`, `route_days` y `route_stops` cubran el flujo.
- No sustituir RBAC backend por ocultamiento UI.
- Si se cambia visibilidad por perfil, actualizar contratos en `scripts/verify-system-contracts.mjs`.

---

## AISK26 - Auditoria integral Haiky Nomina EC 2026

Plan: `PLAN_HAIKY_AUDITORIA_INTEGRAL_NOMINA_EC_2026`.

Estado: diagnostico integral ejecutado localmente el 2026-07-07; gates Haiky verdes y `AuditLock.json` firmado.

Fuente:

- Solicitud del usuario: auditoria integral LANDING, PWA, BACKEND y APP-MOVIL, con proteccion de datos, legal Ecuador, UI/UX, UTF-8, pagos, email, superadmin, reportes, rutas, movilizacion SQLite, permisos, historial empleado y candidatos a eliminacion justificados.

Artefactos:

- `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_NOMINA_EC_2026.md`
- `docs2/auditoria-integral-haiky-2026/INFORME_DIAGNOSTICO.md`
- `docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_JSON.json`
- `docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_AUTOMATIZADO.md`
- `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-00-baseline.md`
- `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-01-zero-silent-failures.md`
- `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-02-movilizacion-sqlite-cierre.md`
- `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-03-lopdp-legal-pagos-email.md`
- `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-04-reportes-uiux-humanizacion.md`
- `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-05-qa-release.md`
- `scripts/haiky-integral-diagnostic.mjs`
- `scripts/haiky-integral-solution.mjs`
- `AuditLock.json`

Runtime AISK26:

- `GastosMovilizacionScreen` envia pendientes al backend antes de cerrar el periodo local de movilizacion.
- `RutaHoyScreen`, `GastosMovilizacionScreen` y `backend/src/app.js` ya no usan `catch(() => {})` silencioso.
- `scripts/verify-system-contracts.mjs` valida splash movil mediante plugin `expo-splash-screen`, compatible con Expo SDK 57, y prohibe `expo.notification` legacy.
- `npm.cmd run haiky:solution` ejecuta diagnostico, contratos, gate anti silent failures, gate UTF-8 y firma `AuditLock.json`.

Reglas operativas AISK26:

- No reportar falsos positivos: distinguir hallazgo confirmado, riesgo residual y modo controlado de desarrollo.
- Mantener PayPhone mock solo si queda bloqueado/visible fuera de produccion real.
- No cerrar movilizacion local si el informe mensual no fue aceptado por backend.
- Todo cambio nuevo debe pasar `npm.cmd run haiky:solution`; usar `npm.cmd run validate` cuando el entorno de DB/Prisma este disponible.

---

## V66 - AuditoriaIntegral2026V66 nomina-ec

Plan: `HAIKY-AUDITORIA-INTEGRAL-V66-NOMINA-EC-2026`.

Estado: V66-00 a V66-03 ejecutadas localmente; QA verde y `AuditLock.json` firmado.

Fuentes:

- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaIntegral2026V66.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v66\v66data.jsx`

Artefactos:

- `docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_V66_NOMINA_EC_2026.md`
- `docs2/auditoria-integral-v66-nomina-ec-2026/INFORME_DIAGNOSTICO_V66.md`
- `.github/prompts/HAIKY-V66-NOMINA-EC-2026-00-baseline.md`
- `.github/prompts/HAIKY-V66-NOMINA-EC-2026-01-rol-pago-email.md`
- `.github/prompts/HAIKY-V66-NOMINA-EC-2026-02-permisos-soporte-medico.md`
- `.github/prompts/HAIKY-V66-NOMINA-EC-2026-03-qa-release.md`

Reconfirmacion V66:

- V66-01 aplica con matiz: `sendRolPagoDisponible()` existia como aviso no bloqueante, pero no habia envio dedicado del rol PDF adjunto ni endpoint PWA. Se agrego `sendRolPagoEmail()`, `POST /api/nomina/:id/rol-email`, buffer opcional en `generatePayrollRolePdf()` y accion en `RolesPagos.jsx`.
- V66-02 aplica: `PermisosScreen` tenia placeholder de soporte medico. Se agrego selector con `expo-image-picker`, validacion/subida backend a almacenamiento documental, metadata `soporteMedico` sin base64 y revision PWA en `PermisosOperacion.jsx`.

Reglas V66:

- No enviar roles por email si `nominas.estado` no es `cerrada`.
- Mantener `sendRolPagoDisponible()` como notificacion no bloqueante del cierre mensual.
- No almacenar base64 medico en novedades; solo metadata documental y URL resuelta.
- El selector movil cubre JPG/PNG; backend acepta PDF para compatibilidad futura.

---

## TFD26 - Terminacion laboral, Formulario 107 y documentos 2026

Plan: `HAIKY-TERMINACION-FORM107-DOCUMENTOS-SKNOMINA-2026`.

Estado: TFD26-00 a TFD26-04 ejecutadas localmente; QA verde.

Fuente:

- Solicitud del usuario sobre causales de terminacion Ecuador, error `generarActaFiniquito is not a function`, horas extra parametrizables, Formulario 107, ficha documental laboral, descarga de contratos y Safari.
- Capturas de PWA en `Empleados > Terminar Relacion Laboral` y `Documentos > Contratos`.
- Fuentes oficiales consultadas: Codigo del Trabajo publicado por Ministerio del Trabajo y pagina SRI de formularios/RDEP 2026.

Artefactos:

- `docs2/PLAN_HAIKY_TERMINACION_FORM107_DOCUMENTOS_2026.md`
- `docs2/terminacion-form107-documentos-2026/INFORME_DIAGNOSTICO_TFD26.md`
- `.github/prompts/TFD26-00-baseline.md`
- `.github/prompts/TFD26-01-terminacion-finiquito.md`
- `.github/prompts/TFD26-02-horas-extra-form107.md`
- `.github/prompts/TFD26-03-documentos-descargas.md`
- `.github/prompts/TFD26-04-qa-release.md`

Runtime TFD26:

- Backend expone `GET /api/empleados/terminacion/causas` con causales laborales versionadas, incluyendo terminacion unilateral durante periodo de prueba para empleador y trabajador, limitada a 90 dias.
- `calcularLiquidacion()` valida la causal, aplica indemnizacion por despido intempestivo con fraccion anual como anio completo, calcula bonificacion por desahucio cuando corresponde y genera acta de finiquito PDF mediante `generarActaFiniquito()`.
- La PWA consume causales desde backend, muestra base legal y bloquea causales que requieren revision previa antes de liquidacion automatica.
- Horas extra quedan parametrizadas desde parametros legales del tenant/anio: jornada mensual, limite semanal, multiplicador suplementario y extraordinario. El detalle visible queda en cierre de nomina y rol PDF.
- Formulario 107 queda versionado contra RDEP/Formulario 107 SRI 2026, con precheck, desglose de ingresos/deducciones y advertencia de revision tributaria antes de entrega oficial.
- Ficha/historial de empleado permite cargar contrato firmado, aviso de entrada IESS, acta de dotacion firmada y otros documentos laborales.
- Descargas documentales se resuelven por endpoint backend y URL absoluta; Safari abre cross-origin en nueva pestana para evitar el error de direccion invalida.

Reglas operativas TFD26:

- No tratar causales que requieren visto bueno, fuerza mayor o muerte/incapacidad como liquidacion automatica sin revision previa.
- No marcar Formulario 107 como oficialmente valido sin validacion tributaria profesional y contraste final con estructura SRI/RDEP vigente.
- No exponer enlaces crudos de storage/S3/local al frontend; toda descarga documental debe pasar por endpoint backend y URL resuelta.
- Mantener mensajes visibles en espanol tecnico y errores con `correlationId` cuando el flujo pasa por API.

Gates TFD26 ejecutados:

- Backend completo: PASS, 52 suites y 273 tests.
- `app.routes.test.js`: PASS, 23 tests e incluye `GET /api/empleados/terminacion/causas`.
- Prisma schema: PASS con binario local de Prisma desde `backend`.
- PWA build: PASS; Vite genero artefactos y se cerro el proceso por PID despues de `built in 2m 15s`.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.
- UTF-8 sin BOM: PASS en archivos modificados y nuevos gobernados.

---

## OAP26 - Ortografia, ayuda, parametros, periodos y contratos 2026

Plan: `HAIKY-ORTOGRAFIA-AYUDA-PARAMETROS-PERIODOS-CONTRATOS-2026`.

Estado: OAP26-00 a OAP26-04 ejecutadas localmente; QA final en curso.

Fuente:

- Solicitud del usuario sobre ortografia, `Año`, `Anticipos y préstamos`, menu `Descuento Anticipos`, parametros validados por owner, periodos enero-diciembre editables, cierre de meses previos vacios, tipos/modelos de contratos Ecuador 2026 y guia de uso.
- Decision posterior del usuario: no atar modelos de contratos al cargo; deben ser visibles y escogerse en la ficha del empleado.
- Regla adicional: no generar codigo duplicado innecesariamente.

Artefactos:

- `docs2/PLAN_HAIKY_ORTOGRAFIA_AYUDA_PARAMETROS_PERIODOS_CONTRATOS_2026.md`
- `docs2/ortografia-ayuda-parametros-periodos-contratos-2026/INFORME_DIAGNOSTICO_OAP26.md`
- `.github/prompts/OAP26-00-baseline.md`
- `.github/prompts/OAP26-01-periodos.md`
- `.github/prompts/OAP26-02-parametros-owner.md`
- `.github/prompts/OAP26-03-contratos-modelos-ficha.md`
- `.github/prompts/OAP26-04-ui-ayuda-ortografia.md`
- `.github/prompts/OAP26-05-qa-release.md`

Runtime OAP26:

- `monthlyPeriodService` genera periodos del 1 de enero al 31 de diciembre, devuelve fechas `YYYY-MM-DD`, permite editar fechas solo en periodos no calculados/cerrados y agrega cierre de meses anteriores vacios.
- `PeriodosNomina.jsx` expone edicion de fechas y cierre de vacios en PWA.
- `configurationService` permite validacion legal por check owner/superadmin, registra aprobacion y bloquea modificacion/eliminacion para perfiles no autorizados.
- `Parametrizacion.jsx` muestra check de owner y deshabilita edicion de parametros legales validados para perfiles distintos a owner/superadmin.
- `ecuadorContractTypes` y plantillas JSON cubren modalidades contractuales referenciales Ecuador 2026.
- `templateGenerator` valida tipo homologado y usa el modelo definido en la ficha del empleado o seleccion manual al emitir PDF.
- `NuevoEmpleado.jsx` muestra `Modelo de contrato`, consume `/documentos/contrato/plantillas` y normaliza valores legados mediante `frontend-web/src/utils/contractTemplates.js`.
- `ContratosGenerados.jsx` usa el modelo de la ficha como sugerencia; no consulta cargos ni mantiene catalogo duplicado.
- `Beneficios.jsx`, `Layout.jsx` y `AyudaUsuario.jsx` corrigen nombres visibles y agregan guia operativa.

Reglas OAP26:

- No reintroducir plantilla de contrato como atributo de cargo/puesto.
- No duplicar catalogos frontend de plantillas; consumir el backend y compartir normalizacion.
- No permitir edicion de fechas de periodos con roles/calculo/cierre.
- No permitir que admin_rrhh modifique parametros legales ya validados por owner.
- No presentar plantillas como documentos oficiales sin revision laboral y registro externo cuando corresponda.

---

## HU26 - Humanizacion y sintesis PWA 2026

Plan: `HAIKY-HUMANIZACION-SINTESIS-PWA-2026`.

Estado: HU26-00 a HU26-06 ejecutadas localmente; QA final en curso.

Fuente:

- Solicitud del usuario: "Humanizar, sintetizar la PWA para que deje de tener tanto texto que confunda, corregir texto del desarrollador y mejorar UI/UX".
- Segunda pasada: eliminar `owner` visible, aclarar que SKNOMINA se monetiza como SaaS y no es parte de contratos laborales; el cliente conserva la responsabilidad legal, laboral, tributaria y de proteccion de datos.

Artefactos:

- `docs2/PLAN_HAIKY_HUMANIZACION_SINTESIS_PWA_2026.md`
- `docs2/humanizacion-sintesis-pwa-2026/INFORME_DIAGNOSTICO_HU26.md`
- `.github/prompts/HU26-00-baseline.md`
- `.github/prompts/HU26-01-compact-notice.md`
- `.github/prompts/HU26-02-documentos-reportes-comunicaciones.md`
- `.github/prompts/HU26-03-parametrizacion-empleado-pagos.md`
- `.github/prompts/HU26-04-qa-release.md`
- `.github/prompts/HU26-05-saas-contratos-roles.md`
- `.github/prompts/HU26-06-qa-release-saas.md`

Runtime HU26:

- Se agrega `frontend-web/src/components/UI/CompactNotice.jsx` para avisos compactos reutilizables.
- Documentos legales reduce avisos SUT/MDT y firmas sin ocultar responsabilidad de registro externo.
- Parametrizacion reduce textos de cabecera, valores legales, archivo bancario, homologacion y jornadas.
- Pagos bancarios y reportes cambian explicaciones extensas por instrucciones accionables.
- Comunicaciones deja de exponer "modo dev" y `dev_logged` como texto de usuario; se muestra "pruebas".
- Resultado de pago deja de mostrar "mock" y usa "pendiente de confirmacion".
- Ficha de trabajador corrige microcopy, acentos visibles y enlace a "Descuento Anticipos".
- Terminos y condiciones declaran la naturaleza SaaS: SKNOMINA provee software, automatizacion, plantillas y almacenamiento; no es empleador, representante, agente, asesor, contador, auditor, intermediario ni parte de contratos laborales.
- Plantillas de contratos legales dejan de mencionar SKNOMINA como sujeto contractual o fuente de calculos laborales; las obligaciones documentales quedan en EL EMPLEADOR y EL TRABAJADOR.
- Etiquetas visibles de rol cambian a "Administrador principal" y "Soporte global"; `owner` y `superadmin` permanecen solo como identificadores tecnicos RBAC/API.
- Parametrizacion, ayuda, registro y planes usan "responsable", "empresa" y "administrador principal" en lugar de jerga interna.

Reglas HU26:

- No cambiar contratos de API, payloads ni reglas legales por cambios editoriales.
- No ocultar bloqueos; sintetizar con siguiente accion clara.
- No duplicar bloques de aviso por pantalla; usar componente compartido.
- No renombrar roles tecnicos en codigo persistente; solo humanizar etiquetas visibles.
- No presentar plantillas o calculos SaaS como asesoria legal, laboral, tributaria o contable.

---

## HRD26 - Reportes y disponibilidad para clientes 2026

Plan: `HAIKY-REPORTES-DISPONIBILIDAD-CLIENTES-2026`.

Estado: HRD26-00 a HRD26-05 ejecutadas localmente; gobierno cerrado localmente, commit y push pendientes.

Fuente:

- Solicitud del usuario: auditoria integral LANDING, PWA, BACKEND y MOBILE con mejora de reportes, disponibilidad para clientes, salidas individuales/globales, mensuales/acumulativas y matriz con empleados en filas y novedades del rol en columnas.
- Requisito adicional: reconfirmar cumplimiento legal Ecuador 2026, evitar falsos positivos, emitir scripts JS de solucion e informe de diagnostico, y dejar plan/prompts/AuditLock.

Artefactos:

- `docs2/PLAN_HAIKY_REPORTES_DISPONIBILIDAD_CLIENTES_2026.md`
- `docs2/reportes-disponibilidad-clientes-2026/DIAGNOSTICO_JSON.json`
- `docs2/reportes-disponibilidad-clientes-2026/INFORME_DIAGNOSTICO.md`
- `docs2/reportes-disponibilidad-clientes-2026/SCRIPTS_JS_SOLUCION.md`
- `docs2/reportes-disponibilidad-clientes-2026/CIERRE_GOBIERNO.md`
- `.github/promts/HRD26-00-baseline.md`
- `.github/promts/HRD26-01-backend-reportes.md`
- `.github/promts/HRD26-02-pwa-disponibilidad.md`
- `.github/promts/HRD26-03-legal-ecuador-2026.md`
- `.github/promts/HRD26-04-scripts-contratos.md`
- `.github/promts/HRD26-05-qa-release.md`

Runtime HRD26:

- `payrollReportService` agrega `PAYROLL_NOVELTY_MATRIX`, `buildPayrollNoveltyMatrixRows` y columnas dinamicas desde lineas de calculo de origen novedad.
- `DescargarReportes.jsx` expone `Matriz de novedades del rol`, alcance `Global` / `Individual`, busqueda de empleado, `Exportar mes` y `Acumulado anual`.
- `verify-system-contracts.mjs` bloquea regresion si desaparece el reporte, el alcance o el acumulado anual.
- `scripts/haiky-reportes-disponibilidad-2026-diagnostic.mjs` genera diagnostico JSON/Markdown.
- `scripts/haiky-reportes-disponibilidad-2026-solution.mjs` ejecuta gates y firma AuditLock.
- `docs2/` esta ignorado globalmente; los artefactos HRD26 se deben agregar con `git add -f`.

Fuentes legales HRD26:

- SRI Impuesto a la Renta: `https://www.sri.gob.ec/impuesto-renta`
- SRI tablas IR 2026 PDF: `https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf`
- Ministerio del Trabajo sistema salarial: `https://salarios.trabajo.gob.ec/`
- IESS empleador: `https://www.iess.gob.ec/es/web/empleador/avisos-de-entrada-y-salida`

Reglas HRD26:

- No eliminar reportes verticales existentes.
- No cambiar payload publico de `/api/reportes/nomina/exportar` ni `/api/reportes/nomina/:anio/consolidado`.
- No prometer XML IESS oficial; mantener Batch IESS TXT/DAT.
- No modificar parametros legales 2026 sin fuente y AuditLock.
- No exponer datos sensibles adicionales en reportes de disponibilidad sin RBAC y justificacion.

# Plan HAIKY-PRODUCTIZACION-NOMINA-EC-DOCUMENTO-NOMINA-2026

Codigo: PNE26
Estado: baseline documental desplegado; fases funcionales pendientes de aprobacion explicita.
Fecha: 2026-06-14
Repositorio objetivo: nuevo_nomina
Fuente de requerimiento: C:\proyectos web\Docs\documento_nomina.md
Fuente de reglas: RULES.md
Lock de gobierno: .vscode/AuditLock.json
Prompts de ejecucion: .github/prompts/PRODUCTIZACION-NOMINA-EC-2026-*.md

## Objetivo

Convertir `nuevo_nomina` en un sistema real de nomina y recursos humanos para Ecuador, superando el estado de boceto mediante un plan HAIKY ejecutable por fases. El plan emula los prompts de `documento_nomina.md`, pero los adapta al stack real del repositorio: Node.js, Express, PostgreSQL, Prisma, React, Expo y Render.

La meta no es copiar una arquitectura Base44 ni introducir catalogos paralelos. La meta es transformar las ideas del documento en contrato tecnico, legal, operativo y comercial verificable, con trazabilidad, pruebas, auditoria y aprobacion por fase.

## Diagnostico de partida

`documento_nomina.md` identifica brechas que impiden considerar el sistema productivo:

| ID | Severidad | Brecha | Respuesta del plan |
|----|-----------|--------|--------------------|
| PNE-B01 | P0 | Coexistencia confusa entre `pg` directo y Prisma. | Fase PNE26-01 define contrato canonico de acceso a datos antes de nuevas migraciones. |
| PNE-B02 | P0 | Migraciones y despliegue Render pueden fallar si el flujo DB no esta gobernado. | Fases PNE26-01 y PNE26-14 exigen validacion Prisma, rollback y smoke de despliegue. |
| PNE-B03 | P0 | Fallos silenciosos en cron, servicios o controladores. | Todas las fases aplican RULES.md: errores estructurados, correlationId y cero `catch` vacio. |
| PNE-B04 | P0 | Generacion bancaria con placeholders o datos no confiables. | Fase PNE26-10 bloquea archivos bancarios sin cuenta validada, cifrado y totales conciliados. |
| PNE-B05 | P0 | Aislamiento multi-tenant incompleto si depende solo de filtros manuales. | Fase PNE26-13 implementa o valida RLS y pruebas con usuario no superusuario. |
| PNE-B06 | P0 | Cuentas bancarias y datos sensibles sin cifrado verificable. | Fases PNE26-01, PNE26-10 y PNE26-13 tratan LOPDP, cifrado y acceso minimo. |
| PNE-B07 | P1 | Parametros legales hardcodeados o sin version/fuente. | Fase PNE26-02 crea parametros versionados con evidencia y responsable. |
| PNE-B08 | P1 | Falta de pruebas de calculo legal. | Fases PNE26-07, PNE26-08 y PNE26-16 exigen casos dorados y QA end-to-end. |
| PNE-B09 | P1 | UI y autoservicio aun incompletos para operacion real. | Fases PNE26-03, PNE26-04, PNE26-05, PNE26-11 y PNE26-12 cubren experiencia operacional. |

## Principios no negociables

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
- Todo archivo `.js`, `.md` y `.json` debe quedar en UTF-8 sin BOM.

## Fases

| Fase | Estado inicial | Objetivo |
|------|----------------|----------|
| PNE26-00 | completed | Baseline documental, plan, prompts y AuditLock sin tocar runtime. |
| PNE26-01 | pending_approval | Contrato tecnico de datos, ORM, migraciones, errores y multi-tenant. |
| PNE26-02 | pending_approval | Parametros legales Ecuador versionados y matriz de cumplimiento. |
| PNE26-03 | pending_approval | Identidad visual, layout operativo y navegacion por rol. |
| PNE26-04 | pending_approval | Autenticacion, RBAC, tenant activo y perfiles laborales. |
| PNE26-05 | pending_approval | Empresas, onboarding OWNER y configuracion inicial. |
| PNE26-06 | pending_approval | Empleados, contratos, datos bancarios cifrados y ficha laboral. |
| PNE26-07 | pending_approval | Marcaciones, geocerca, novedades y aprobaciones. |
| PNE26-08 | pending_approval | Motor de nomina ecuatoriana, cierre, reapertura y casos dorados. |
| PNE26-09 | pending_approval | Liquidaciones, finiquito, equipos y desvinculacion. |
| PNE26-10 | pending_approval | Documentos legales, roles PDF, contratos, ATS y custodia. |
| PNE26-11 | pending_approval | Archivos bancarios configurables y conciliacion de totales. |
| PNE26-12 | pending_approval | Reportes operativos, regulatorios y exportables. |
| PNE26-13 | pending_approval | Auditoria visible, LOPDP, cifrado, RLS y trazabilidad. |
| PNE26-14 | pending_approval | Automatizaciones, cron jobs, Redis y notificaciones. |
| PNE26-15 | pending_approval | Planes, suscripciones, PayPhone y capacidades comerciales. |
| PNE26-16 | pending_approval | QA end-to-end, CI/CD, Render y evidencia productizable. |

## Entregables por fase

| Fase | Entregable documental minimo | Evidencia tecnica minima |
|------|------------------------------|--------------------------|
| PNE26-00 | Este plan, prompts y AuditLock actualizado. | JSON parse, UTF-8 sin BOM, `git diff --check`. |
| PNE26-01 | `docs/REPORTE_PNE26_01_CONTRATO_TECNICO.md` | Prisma validate, mapa pg/Prisma, matriz de endpoints. |
| PNE26-02 | `docs/REPORTE_PNE26_02_LEGAL_ECUADOR.md` | Seed versionado, tests de parametros, evidencia de fuente. |
| PNE26-03 | `docs/REPORTE_PNE26_03_UI_LAYOUT.md` | Build frontend y captura Browser si aplica. |
| PNE26-04 | `docs/REPORTE_PNE26_04_AUTH_RBAC.md` | Tests auth/RBAC y flujos por rol. |
| PNE26-05 | `docs/REPORTE_PNE26_05_EMPRESAS_ONBOARDING.md` | Flujo empresa + owner con auditoria. |
| PNE26-06 | `docs/REPORTE_PNE26_06_EMPLEADOS.md` | Validacion cedula, cifrado cuenta, CRUD y tests. |
| PNE26-07 | `docs/REPORTE_PNE26_07_ASISTENCIA.md` | Tests Haversine, no DELETE, aprobaciones. |
| PNE26-08 | `docs/REPORTE_PNE26_08_MOTOR_NOMINA.md` | Casos dorados, idempotencia, cierre inmutable. |
| PNE26-09 | `docs/REPORTE_PNE26_09_LIQUIDACIONES.md` | Casos por tipo de salida, equipos pendientes. |
| PNE26-10 | `docs/REPORTE_PNE26_10_DOCUMENTOS.md` | PDF/XML controlados, storage y auditoria. |
| PNE26-11 | `docs/REPORTE_PNE26_11_BANCOS.md` | Totales conciliados, rechazo de placeholders. |
| PNE26-12 | `docs/REPORTE_PNE26_12_REPORTES.md` | Exportables y permisos por reporte. |
| PNE26-13 | `docs/REPORTE_PNE26_13_SEGURIDAD_AUDITORIA.md` | Prueba RLS no superuser, LOPDP, logs. |
| PNE26-14 | `docs/REPORTE_PNE26_14_AUTOMATIZACIONES.md` | Cron sin fallos silenciosos, retry y alertas. |
| PNE26-15 | `docs/REPORTE_PNE26_15_COMERCIAL.md` | Planes/capacidades y PayPhone en modo seguro. |
| PNE26-16 | `docs/REPORTE_PNE26_16_QA_RELEASE.md` | Backend tests, frontend build, Expo doctor, smoke Render. |

## Emulacion de prompts del documento fuente

Los prompts del documento se convierten en prompts operables bajo `.github/prompts`:

- Modelado Base44 se traduce a PNE26-01, PNE26-05 y PNE26-06.
- Layout visual se traduce a PNE26-03.
- Autenticacion y roles se traduce a PNE26-04.
- Dashboard, empleados, marcaciones, novedades y nomina se traducen a PNE26-05..08.
- Liquidacion, documentos y bancos se traducen a PNE26-09..11.
- Reportes, auditoria y superadmin se traducen a PNE26-12..13.
- Automatizaciones, parametros legales y pruebas se traducen a PNE26-14, PNE26-02 y PNE26-16.
- Planes, suscripciones y canal de pago se integran en PNE26-15 para que el sistema sea comercializable.

## Gates globales

- `RULES.md` leido y aplicado.
- `.vscode/AuditLock.json` firmado antes de iniciar fase siguiente.
- UTF-8 sin BOM en archivos modificados.
- `git diff --check` sin errores.
- `npx prisma validate` cuando toque modelo o migracion.
- Tests backend para servicios criticos.
- Build frontend cuando toque UI.
- `npx expo-doctor` cuando toque app movil.
- Evidencia de RLS con usuario no superusuario antes de produccion.
- Validacion legal/contable externa antes de activar calculos para clientes reales.

## Riesgos residuales del baseline

- Los valores legales 2026 deben verificarse contra fuentes oficiales vigentes antes de sembrarse o usarse en calculos reales.
- El documento fuente tiene mojibake; no debe copiarse literalmente sin normalizacion.
- El estado anterior HNBE26 quedo cerrado con riesgos residuales; este plan los absorbe, pero no los considera resueltos hasta pasar sus fases.
- La activacion productiva requiere pruebas con PostgreSQL, Redis, Render, usuario no superusuario y datos de prueba sin secretos.

## Orden de ejecucion

1. Ejecutar solo el prompt de la fase aprobada.
2. Leer `RULES.md`, `AuditLock.json`, este plan y el prompt de fase.
3. Confirmar que la fase anterior esta firmada.
4. Implementar cambios estrictamente dentro del alcance de la fase.
5. Ejecutar validaciones de fase.
6. Crear reporte de fase.
7. Actualizar `AuditLock.json` con `phaseCompleted`, `filesModified`, `validationChecks` y `signature`.
8. Commit esperado: `phase: PNE26-XX task: <descripcion>`.

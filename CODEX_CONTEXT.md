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
Rama activa esperada: `codex/haiky-render-legal-plan`.  
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
- Valores legales 2026 tienen IR SRI y SBU MDT reconfirmados; IESS y cierre profesional permanecen pendientes, con bloqueo productivo activo.
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
- Validar aportes IESS Ecuador 2026 y revisión profesional antes de levantar el bloqueo productivo.
- Probar RLS en Render con usuario no superusuario y evidencia sin secretos.
- Completar pruebas automatizadas de regresión para liquidación, RBAC, bancos y aislamiento tenant.
- Validar PayPhone sandbox/oficial con webhook, firma, conciliación e idempotencia.
- Ejecutar smoke visual manual de PWA con backend activo.

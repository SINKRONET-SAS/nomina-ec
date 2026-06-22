# Plan Haiky - HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026 |
| Codigo | DCEN26 |
| Estado | DCEN26-00 documental generado; runtime pendiente de aprobacion por fase |
| Fase actual | DCEN26-01 pendiente de aprobacion explicita |
| Alcance | empresa demo comercial totalmente configurada con usuarios, 30 empleados ficticios, estructura Quito/Guayaquil, zonas, asistencias de un mes, smoke data y cierre de nomina de 5 meses 2026 |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/demo-comercial-empresa-nomina-ec-2026/MATRIZ_DCEN26_REQUERIMIENTOS.md` |
| Runbook | `docs2/demo-comercial-empresa-nomina-ec-2026/RUNBOOK_DCEN26_DEMO_COMERCIAL.md` |
| Reporte baseline | `docs2/demo-comercial-empresa-nomina-ec-2026/REPORTE_DCEN26_00_BASELINE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

DCEN26 convierte el requerimiento de presentacion comercial en una linea Haiky ejecutable para disponer de una empresa demo realista, reproducible y segura. La demo debe permitir mostrar Nomina-Ec de punta a punta: configuracion inicial, usuarios, estructura organizativa, zonas de marcacion, fichas de empleados, asistencia, novedades, calculo y cierre de nomina 2026, reportes y dashboard.

La demo no puede usar datos personales reales ni credenciales reutilizables. Todo dato debe ser ficticio, marcado como demo, idempotente, reversible y aislado por tenant.

## Reglas DCEN26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No usar datos reales de personas, empresas, cuentas bancarias, correos personales, telefonos o coordenadas privadas.
- Toda entidad demo debe quedar marcada con `demo`, tenant/codigo identificable y rollback documentado.
- Los seeds deben ser idempotentes: ejecutar dos veces no duplica usuarios, empleados, asistencias, novedades, periodos ni roles.
- Los usuarios demo deben usar credenciales controladas por variables de entorno o contrasenas temporales rotables, nunca secretos reales en repo.
- La empresa demo debe quedar completamente configurada antes de crear asistencia o cerrar nomina.
- Las coordenadas de Quito y Guayaquil deben representar puntos comerciales/laborales ficticios o publicos, no domicilios reales.
- Los 30 empleados deben tener fichas completas: cedula ficticia valida, fecha de nacimiento, fecha de ingreso entre 2015 y 2026, provincia/ciudad, unidad, zona, jornada, region de decimo cuarto y datos de pago ficticios.
- La asistencia de un mes debe cubrir jornadas, atrasos, faltas justificadas, permisos, marcaciones fuera de zona y casos normales para demostracion.
- Los cierres de nomina de 5 meses 2026 deben ser reproducibles, auditables, reversibles y no mezclarse con tenants productivos.
- Todo avance operativo debe quedar visible o verificable en PWA: empresa demo, dashboard, empleados, asistencia, cierre de nomina y reportes.
- Commits esperados: `phase: DCEN26-XX task: ...`.

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| DCEN26-00 | P0 | completed_documental | Baseline documental, matriz, runbook, prompts, contexto y AuditLock sin tocar runtime. |
| DCEN26-01 | P0 | pending_approval | Diagnostico del runtime actual: modelos, seeds existentes, rutas, factories, datos demo previos y riesgos de duplicidad. |
| DCEN26-02 | P0 | pending_approval | Tenant/empresa demo y 4 usuarios: SUPERADMIN observador, OWNER, RRHH y supervisor/empleado demo con RBAC visible. |
| DCEN26-03 | P0 | pending_approval | Parametrizacion demo completa: legales 2026, bancos ficticios, homologacion bancaria, tipos de novedades, jornadas y catalogos Ecuador. |
| DCEN26-04 | P0 | pending_approval | Estructura Quito/Guayaquil: unidades organizativas, centros de costo, zonas de marcacion con coordenadas y jornadas asignadas. |
| DCEN26-05 | P0 | pending_approval | 30 empleados ficticios completos con fechas de ingreso 2015-2026, datos personales, pago, contrato demo y asignaciones operativas. |
| DCEN26-06 | P0 | pending_approval | Asistencia de un mes: marcaciones, novedades, permisos, atrasos, fuera de zona y evidencias smoke. |
| DCEN26-07 | P0 | pending_approval | Cierre de nomina de 5 meses 2026: apertura, calculo, cierre, roles, reportes, bancos y contabilidad demo. |
| DCEN26-08 | P0 | pending_approval | QA comercial end-to-end, reset demo, capturas/runbook, AuditLock, commit y push. |

## Entregables esperados

- Seed o comando reproducible para crear/restaurar la empresa demo.
- Tenant demo aislado y facil de identificar.
- 4 usuarios demo con roles y recorrido comercial claro.
- 30 empleados ficticios con fichas completas y diversidad operativa.
- Estructura Quito/Guayaquil con zonas y coordenadas publicas/ficticias.
- Parametros legales y operativos listos para no cargar tareas administrativas al prospecto.
- Asistencias de un mes con casos normales y excepciones.
- Cinco periodos 2026 cerrados con reportes y archivos de pago demo.
- Dashboard y rutas PWA que permitan presentar la demo sin explicar datos faltantes.
- Runbook para preparar, resetear, validar y presentar la demo comercial.

## Gates globales

- `npx.cmd prisma validate` en `backend`.
- `npx.cmd prisma migrate deploy` si hay migraciones.
- `npm.cmd test -- --runInBand` en `backend`.
- Smoke seed demo idempotente: crear, re-ejecutar, verificar conteos, rollback/reset.
- `npm.cmd run build` y `npm.cmd run smoke:pwa` en `frontend-web`.
- `npm.cmd run check:stores` en `app-movil` si se toca mobile.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.md`, `.json` modificados.
- Revision manual de navegacion demo en PWA.
- AuditLock firmado por fase.

## Riesgos y bloqueos

- El demo no debe confundirse con ambiente productivo ni contener datos reales.
- Los cierres de nomina 2026 deben usar parametros vigentes y quedar marcados como demostracion comercial.
- Los archivos bancarios demo no deben ser cargables accidentalmente en bancos reales sin marca/entorno de seguridad.
- El reset demo debe ser seguro: solo afecta tenant demo y debe bloquearse si detecta tenant productivo.

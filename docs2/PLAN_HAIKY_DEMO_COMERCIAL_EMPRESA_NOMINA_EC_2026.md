# Plan Haiky - HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026 |
| Codigo | DCEN26 |
| Estado | DCEN26-00..08 ejecutadas localmente |
| Fase actual | DCEN26-08 cerrada localmente |
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
| DCEN26-01 | P0 | completed_local | Diagnostico del runtime actual: modelos, seeds existentes, rutas, factories, datos demo previos y riesgos de duplicidad. |
| DCEN26-02 | P0 | completed_local | Tenant/empresa demo y 4 usuarios: SUPERADMIN observador, OWNER, RRHH y supervisor/empleado demo con RBAC visible. |
| DCEN26-03 | P0 | completed_local | Parametrizacion demo completa: legales 2026, bancos ficticios, homologacion bancaria, tipos de novedades, jornadas y catalogos Ecuador. |
| DCEN26-04 | P0 | completed_local | Estructura Quito/Guayaquil: unidades organizativas, centros de costo, zonas de marcacion con coordenadas y jornadas asignadas. |
| DCEN26-05 | P0 | completed_local | 30 empleados ficticios completos con fechas de ingreso 2015-2026, datos personales, pago, contrato demo y asignaciones operativas. |
| DCEN26-06 | P0 | completed_local | Asistencia de un mes: marcaciones, novedades, permisos, atrasos, fuera de zona y evidencias smoke. |
| DCEN26-07 | P0 | completed_local | Cierre de nomina de 5 meses 2026: apertura, calculo, cierre, roles, reportes, bancos y contabilidad demo. |
| DCEN26-08 | P0 | completed_local | QA comercial end-to-end, reset demo, runbook, AuditLock, commit y push. |

## Ejecucion runtime 2026-06-22

DCEN26 quedo implementado como seed idempotente en `backend/scripts/seed-demo-commercial.js`, con comandos formales en `backend/package.json`:

- `npm.cmd run seed:demo`: reconstruye la empresa demo solo si el tenant existente esta marcado como `demo` y `demoCode=DCEN26`.
- `npm.cmd run seed:demo:verify`: valida los conteos minimos de la demo sin modificar datos.
- `npm.cmd run seed:demo:reset`: elimina solo el tenant demo DCEN26 y sus dependencias, bloqueando cualquier tenant no demo.

Conteos verificados localmente:

- 1 tenant demo: `EMPRESA DEMO NOMINA EC S.A.` con RUC ficticio de demo.
- 4 usuarios demo y credenciales temporales en `backend/.demo-credentials.json` ignorado por git.
- 30 empleados ficticios con cedulas validas de demo, fechas de nacimiento, ingresos entre 2015 y 2026, domicilio, provincia/ciudad, unidad, zona, jornada, region de decimo cuarto y pago ficticio cifrado.
- 6 unidades Quito/Guayaquil, 2 zonas de marcacion con coordenadas publicas/ficticias y 2 jornadas parametrizadas.
- 20 cargas familiares demo, contratos demo y vinculo app para usuario empleado.
- 1.284 marcaciones de mayo 2026 y 101 novedades para casos normales, atrasos, permisos, faltas y fuera de zona.
- 5 periodos 2026 cerrados y 150 roles cerrados con URLs `demo://` para rol y archivo bancario demo.

`BANK_ACCOUNT_ENCRYPTION_KEY` queda sin valor en `backend/.env` por decision operativa local. El seed usa una clave demo efimera en memoria si no hay clave bancaria valida y no escribe secretos reales al repositorio.

## Segunda pasada runtime 2026-06-22

Se reejecuto DCEN26 despues de incorporar los parametros operativos de rutas moviles para mercaderistas. La base no fue reconstruida ni se descartaron migraciones: se aplico la migracion vigente `20260623023000_mrm26_route_visits` y luego se ejecuto solo el reset seguro del tenant demo DCEN26.

Comandos ejecutados desde `backend`:

- `npx.cmd prisma migrate deploy`: PASS, migracion de rutas aplicada y preservada.
- `npx.cmd prisma generate`: PASS.
- `npm.cmd run seed:demo:reset`: PASS, elimino 1 tenant marcado como demo.
- `npm.cmd run seed:demo`: PASS, reconstruyo y verifico la demo.
- `npm.cmd run seed:demo:verify`: PASS, confirmo conteos persistidos.

Conteos verificados en esta segunda pasada:

- 1 tenant demo DCEN26.
- 4 usuarios demo.
- 30 empleados ficticios, con el usuario movil asociado al primer empleado demo como mercaderista.
- 20 cargas familiares.
- 6 unidades Quito/Guayaquil, 2 zonas de marcacion y 2 jornadas.
- 3 sitios de ruta para visita de campo, 1 ruta diaria y 3 paradas para la app movil.
- 1.284 marcaciones de mayo 2026 y 101 novedades.
- 5 periodos 2026 cerrados, 150 roles cerrados y 1 perfil bancario demo.

Reporte de evidencia: `docs2/demo-comercial-empresa-nomina-ec-2026/REPORTE_DCEN26_SEGUNDA_PASADA_MRM26_2026_06_22.md`.

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

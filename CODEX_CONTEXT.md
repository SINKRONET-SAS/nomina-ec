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

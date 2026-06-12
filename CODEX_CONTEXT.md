# Contexto operativo Codex - Plan HAIKY

Proyecto: Nómina-Ec, SaaS de nomina Ecuador.  
Raiz: `C:\proyectos web\nuevo_nomina`.  
Repositorio remoto: `https://github.com/SINKRONET-SAS/nomina-ec.git`.  
Rama activa esperada: `codex/haiky-render-legal-plan`.  
Fecha de contexto: 2026-06-12.

## Regla principal

Antes de modificar codigo runtime se debe leer `RULES.md` y validar `.vscode/AuditLock.json`.

## Componentes

- `backend`: Express, PostgreSQL con `pg`, Prisma para migraciones, JWT, S3, Redis, cron jobs, calculos de nomina, reportes y documentos.
- `frontend-web`: React + Vite + Tailwind + React Router + TanStack Query.
- `app-movil`: Expo + React Native.
- `docs`: documentacion legal existente.
- `docs2`: planes HAIKY, diagnosticos y runbooks.

## Estado tecnico vigente

- Prisma 6 esta instalado y `backend/prisma/schema.prisma` existe.
- La migracion inicial existe en `backend/prisma/migrations`.
- `backend/src/config/migrate.js` ejecuta `prisma migrate deploy`.
- PostgreSQL local fue validado en `127.0.0.1:5432`.
- Redis/Memurai local fue validado en `127.0.0.1:6379`.
- `render.yaml` define API, worker cron, frontend estatico y PostgreSQL.
- El backend runtime sigue usando `pg` directo; Prisma gobierna migraciones.
- El generador bancario usa perfiles configurables y descifra cuentas solo en memoria.
- `SUPERADMIN` y `OWNER` tienen seed seguro por variables de entorno.
- RLS existe en migracion SQL y cuenta con runbook/script de verificacion Render; falta ejecutarlo con usuario no superusuario de staging.
- AWS SDK v2 fue reemplazado por AWS SDK v3 modular en S3.
- Valores legales 2026 tienen IR SRI y SBU MDT reconfirmados; IESS y cierre profesional permanecen pendientes, con bloqueo productivo activo.
- La marca visible correcta del sistema es `Nómina-Ec`; `Plan HAIKY` queda reservado para metodologia interna de planificacion.
- Se reviso `C:\proyectos web\sinkroniq-mobile` como referencia para landing, PWA, auth, planes y PayPhone.
- Existe plan documental nuevo en `docs2/PLAN_HAIKY_LANDING_PWA_AUTH_PAYPHONE.md`.

## Orden HAIKY revisado

1. Fase 0: preparacion, diagnostico y candado.
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
12. Fase 11: motor de nomina.
13. Fase 12: liquidacion y finiquito.
14. Fase 13: documentos regulatorios.
15. Fase 14: reportes y auditoria visible.
16. Fase 15: automatizaciones.
17. Fase 16: pruebas, CI/CD y hardening.
18. Fase 17: validacion legal Ecuador 2026.
19. Fase 18: migracion AWS SDK v3.
20. Fase 19: prueba RLS Render con usuario no superusuario.
21. Fase 20: renombre de producto a Nómina-Ec.
22. Fase 21: landing publica Nómina-Ec.
23. Fase 22: PWA Nómina-Ec.
24. Fase 23: auth backend, registro y recuperacion.
25. Fase 24: auth PWA y app movil.
26. Fase 25: planes y suscripciones Nómina-Ec.
27. Fase 26: PayPhone como canal de pago.
28. Fase 27: legal, QA comercial y Render.

## Criterios de escritura

- Guardar `.js`, `.md` y `.json` como UTF-8 sin BOM.
- No dejar `catch` vacios ni retornos silenciosos.
- Documentacion en espanol tecnico.
- Variables de codigo en ingles.
- Logs y errores visibles en espanol.

## Pendientes criticos

- Validar aportes IESS Ecuador 2026 y revision profesional antes de levantar el bloqueo productivo.
- Probar RLS en Render con usuario no superusuario y evidencia sin secretos.
- Completar pruebas automatizadas de regresion para liquidacion, RBAC, bancos y aislamiento tenant.
- Corregir marca visible antigua `Plan Haiky` / `Sistema de RRHH Ecuador` a `Nómina-Ec`.
- Implementar landing publica, PWA, registro, login y recuperacion de password para PWA y app movil.
- Definir planes comerciales y canal PayPhone con checkout, webhook, conciliacion e idempotencia.

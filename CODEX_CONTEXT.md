# Contexto operativo Codex - Plan HAIKY

Proyecto: SaaS RRHH Ecuador.  
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
- RLS existe en migracion SQL, pero requiere prueba en Render con usuario no superusuario.
- AWS SDK v2 sigue presente en S3 y debe migrarse a AWS SDK v3.
- Valores legales 2026 permanecen como `pendiente_validacion_oficial` hasta respaldo oficial.

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

## Criterios de escritura

- Guardar `.js`, `.md` y `.json` como UTF-8 sin BOM.
- No dejar `catch` vacios ni retornos silenciosos.
- Documentacion en espanol tecnico.
- Variables de codigo en ingles.
- Logs y errores visibles en espanol.

## Pendientes criticos

- Validar valores legales Ecuador 2026 con fuente oficial antes de produccion.
- Migrar `aws-sdk` v2 a AWS SDK v3 modular.
- Probar RLS en Render con usuario no superusuario y evidencia sin secretos.
- Completar pruebas automatizadas de regresion para liquidacion, RBAC, bancos y aislamiento tenant.

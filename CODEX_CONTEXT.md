# Contexto operativo Codex - Plan HAIKY

Proyecto: SaaS RRHH Ecuador.  
Raiz: `C:\proyectos web\nuevo_nomina`.  
Fecha de contexto: 2026-06-11.

## Regla principal

Antes de modificar codigo runtime se debe leer `RULES.md` y validar la fase activa en `.vscode/AuditLock.json`.

## Componentes

- `backend`: Express, PostgreSQL con `pg`, JWT, S3, cron jobs, calculos de nomina, reportes y documentos.
- `frontend-web`: React + Vite.
- `app-movil`: Expo + React Native.
- `docs`: documentacion legal existente.
- `docs2`: planificacion e insumos de ejecucion.

## Estado tecnico observado

- No existe Prisma instalado ni `schema.prisma`.
- No existe `backend/src/config/schema.sql`.
- No existe `backend/src/config/migrate.js`, aunque `backend/package.json` declara `db:migrate`.
- El backend usa variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_SSL`.
- El worker cron esta en `backend/src/config/cron-jobs.js`.
- El generador bancario actual esta en `backend/src/services/bancoAebGenerator.js`.

## Orden obligatorio

1. Fase 0: plan, contexto, prompts y AuditLock.
2. Fase 1: dependencias.
3. Fase 2: GitHub y rama.
4. Fase 3: PostgreSQL.
5. Fase 4: migraciones y decision Prisma.
6. Fase 5: Render.
7. Fase 6: cumplimiento legal.
8. Fase 7: archivos planos bancarios.
9. Fase 8: SUPERADMIN y OWNERS.

## Criterios de escritura

- Guardar `.js`, `.md` y `.json` como UTF-8 sin BOM.
- No dejar `catch` vacios ni retornos silenciosos.
- Documentacion en espanol tecnico.
- Variables de codigo en ingles.
- Logs y errores visibles en espanol.

## Pendientes criticos

- Definir si se adopta Prisma o migrador SQL propio.
- Crear base PostgreSQL local y estrategia Render.
- Corregir `db:migrate`.
- Parametrizar calculos legales por anio y fuente.
- Sustituir placeholder de cuenta bancaria por descifrado seguro en memoria.
- Validar RBAC de SUPERADMIN, OWNER, ADMIN_RRHH y EMPLOYEE.

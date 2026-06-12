# Plan HAIKY revisado - nomina-ec

Fecha base: 2026-06-11  
Fuente revisada: `docs2/Plan_HAIKY_nomina_ec.md`  
Repositorio: `SINKRONET-SAS/nomina-ec`  
Stack vigente: Node.js, Express, PostgreSQL, Prisma, React, Expo, Render

## 1. Criterio de revision

El documento fuente propone una implementacion en Base44. Para este repositorio, la ruta revisada mantiene el stack ya existente y convierte las fases Base44 en fases HAIKY ejecutables sobre:

- Backend Express con `pg` en runtime y Prisma como fuente de migraciones.
- PostgreSQL local y PostgreSQL administrado en Render.
- Redis local/externo para cache, sesiones o colas futuras.
- Frontend React + Vite.
- App movil Expo.

No se migra a Base44 en esta revision. Una migracion a Base44 requeriria aprobacion separada porque reemplaza arquitectura, despliegue, modelo de datos y runtime.

## 2. Estado real del repositorio

Ya existe:

- Prisma 6 con `backend/prisma/schema.prisma`.
- Migracion inicial aplicada en PostgreSQL local.
- `backend/src/config/migrate.js` funcional.
- `render.yaml` para API, worker, frontend y PostgreSQL.
- Redis local verificado.
- `AuditLock` firmado hasta fase 8 de la ejecucion anterior.
- Rama `codex/haiky-render-legal-plan` publicada en GitHub.

Brechas que siguen abiertas:

- Runtime sigue usando `pg` directo; Prisma gobierna esquema pero no consultas.
- Falta RLS real en PostgreSQL.
- Falta test automatizado para calculos legales.
- Falta `AppError` centralizado y `correlationId` universal.
- Falta parametrizar valores legales en base de datos.
- Falta CI/CD.
- Falta OpenAPI.
- Falta implementacion completa de auditoria visible.

## 3. Fases HAIKY revisadas

### Fase 0: Preparacion, diagnostico y candado

Objetivo: limpiar el diagnostico fuente, actualizar contexto operativo y dejar prompts faseados.

Entregables:

- Plan revisado en `docs2/PLAN_HAIKY_NOMINA_EC_REVISADO.md`.
- `CODEX_CONTEXT.md` actualizado al estado real.
- Prompts 00 a 16 en `.github/prompts`.
- `AuditLock.json` firmado.

### Fase 1: Dependencias y reproducibilidad

Objetivo: mantener instalacion reproducible.

Checks:

- `npm ci` por componente.
- `npm run build` en frontend.
- `node --check` en backend modificado.
- Version Node documentada para Render.

### Fase 2: GitHub y rama

Objetivo: conservar trazabilidad.

Checks:

- Rama `codex/haiky-render-legal-plan`.
- Remoto `origin` apuntando a `SINKRONET-SAS/nomina-ec`.
- Commits con `phase:` y `task:`.

### Fase 3: PostgreSQL y Redis

Objetivo: consolidar infraestructura local y Render.

Tareas:

- Verificar `plan_haiky`.
- Verificar Redis/Memurai local.
- Documentar roles y permisos.
- Preparar RLS real como fase posterior.

### Fase 4: Prisma y migraciones

Objetivo: que Prisma sea fuente de esquema.

Tareas:

- Mantener Prisma 6.
- Agregar migraciones incrementales.
- Evitar `schema.sql` paralelo.
- Documentar convivencia temporal con `pg`.

### Fase 5: Render

Objetivo: dejar despliegue operable.

Tareas:

- Validar `render.yaml`.
- Separar API y worker.
- Documentar secretos.
- Preparar Redis externo.

### Fase 6: Legal Ecuador y redondeos

Objetivo: proteger calculos criticos.

Tareas:

- Mover parametros legales a base de datos.
- Validar tabla IR/IESS/SBU con fuentes oficiales.
- Agregar pruebas de nomina, decimos, vacaciones y finiquito.

### Fase 7: Archivos bancarios

Objetivo: perfiles bancarios seguros.

Tareas:

- Mantener perfiles versionados.
- Agregar checksum y auditoria por generacion.
- Validar perfiles con archivos anonimizados.

### Fase 8: SUPERADMIN, OWNERS y RBAC

Objetivo: cerrar seguridad administrativa.

Tareas:

- Agregar `requireRole` granular por modulo.
- Auditar acciones privilegiadas.
- Definir impersonacion auditada si aplica.

### Fase 9: Empleados y experiencia operativa

Objetivo: completar CRUD y detalle empleado.

Tareas:

- Busqueda, filtros y paginacion.
- Detalle con tabs.
- Validacion de cedula.
- Control de acceso por rol.

### Fase 10: Marcaciones y novedades

Objetivo: asegurar asistencia.

Tareas:

- Haversine con perimetro.
- Auditoria de marcaciones.
- Prohibicion tecnica de eliminacion.
- Workflow de novedades.

### Fase 11: Motor de nomina

Objetivo: robustecer calculo mensual.

Tareas:

- Detalle de calculo persistido.
- Dias trabajados reales.
- Anticipos/prestamos.
- Inmutabilidad de nomina cerrada en DB.

### Fase 12: Liquidacion y finiquito

Objetivo: calculo legal de salida.

Tareas:

- Rubros proporcionales.
- Indemnizacion y desahucio.
- Bloqueo por equipos pendientes.
- PDF de acta.

### Fase 13: Documentos regulatorios

Objetivo: PDF/XML confiables.

Tareas:

- Rol de pagos PDF.
- ATS/SRI XML.
- Contratos con clausula irrenunciable.
- Storage externo y auditoria.

### Fase 14: Reportes y auditoria visible

Objetivo: visibilidad operacional.

Tareas:

- Reporte asistencia.
- Reporte nomina.
- Provisiones.
- Costos por departamento.
- Pantalla de AuditLog.

### Fase 15: Automatizaciones

Objetivo: jobs programados confiables.

Tareas:

- Marcaciones faltantes.
- Alertas de decimos.
- Notificaciones email/push.
- Logs con `correlationId`.

### Fase 16: Pruebas, CI/CD y hardening

Objetivo: preparar produccion.

Tareas:

- Tests de calculos legales.
- Tests RBAC.
- GitHub Actions.
- OpenAPI.
- Rate limiting.
- Migracion AWS SDK v2 a v3.

## 4. Prioridad recomendada

1. Fase 16 parcial: tests criticos y CI.
2. Fase 6: parametros legales en DB con fuentes.
3. Fase 11: nomina con detalle persistido e inmutabilidad DB.
4. Fase 3/4: RLS real en PostgreSQL.
5. Fase 8: RBAC granular.
6. Fase 7/13: bancos y documentos auditados.

## 5. Criterio de listo para produccion

- `npm ci`, build, migraciones y tests pasan en CI.
- RLS o politica equivalente se valida automaticamente.
- Nomina cerrada no puede modificarse por API ni SQL ordinario.
- Cuentas bancarias nunca aparecen completas en logs o UI.
- Parametros legales tienen fuente, fecha y responsable de aprobacion.
- SUPERADMIN y OWNER estan sembrados por variables seguras.
- Render tiene API, worker, frontend, PostgreSQL, Redis y storage externo configurados.

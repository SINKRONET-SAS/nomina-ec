# Plan HAIKY de ejecucion, despliegue y cumplimiento

Fecha base: 2026-06-11  
Repositorio: `C:\proyectos web\nuevo_nomina`  
Estado: plan inicial, pendiente de aprobacion por fases segun `RULES.md`

## 0. Reglas de gobierno

Este plan se ejecuta bajo las reglas HAIKY no negociables:

- Cada fase requiere aprobacion explicita antes de iniciar.
- Cada cierre de fase debe actualizar `.vscode/AuditLock.json`.
- Cada cambio debe quedar trazado en commits con `phase: <X>` y `task: <Y.Z>`.
- No se aceptan fallos silenciosos, deuda tecnica nueva ni cambios de API publica sin compatibilidad.
- Todo archivo `.js`, `.md` y `.json` debe validarse como UTF-8 sin BOM.

## 1. Diagnostico inicial del repositorio

Componentes detectados:

- `backend`: API Node.js + Express, PostgreSQL por `pg`, cron jobs con `node-cron`, S3, reportes, nomina, asistencia y documentos.
- `frontend-web`: React + Vite.
- `app-movil`: Expo + React Native.
- `docs`: cumplimiento legal existente.
- `docs2`: insumos generados previos.

Riesgos detectados antes de ejecutar:

- No existe `prisma/schema.prisma` ni dependencia `prisma` o `@prisma/client`.
- `backend/package.json` declara `db:migrate`, pero no existe `backend/src/config/migrate.js`.
- `backend/src/config/database.js` intenta ejecutar `schema.sql`, pero `backend/src/config/schema.sql` no existe.
- `.github`, `.vscode/AuditLock.json` y `CODEX_CONTEXT.md` no existian al inicio de este plan.
- El cron contiene un `catch` que ignora errores cuando falta `sesiones`; esto incumple la regla Zero silent failures.
- El generador bancario usa cuenta placeholder `0000000000`; no esta listo para carga bancaria real.

## 2. Fases HAIKY

### Fase 0: Preparacion y bloqueo de auditoria

Objetivo: dejar el proyecto gobernado antes de modificar comportamiento.

Acciones:

1. Crear `CODEX_CONTEXT.md`.
2. Crear `.vscode/AuditLock.json` inicial.
3. Crear prompts por fase en `.github/prompts`.
4. Confirmar que el plan maestro fue aprobado por el OWNER tecnico.

Criterios de cierre:

- `AuditLock` inicial firmado.
- Prompts disponibles por fase.
- No se modifico codigo runtime.

### Fase 1: Dependencias e instalacion reproducible

Objetivo: instalar y fijar dependencias necesarias para backend, frontend y app movil.

Acciones:

1. Ejecutar `npm install` en `backend`, `frontend-web` y `app-movil`.
2. Generar o actualizar `package-lock.json` por componente.
3. Verificar vulnerabilidades con `npm audit` y clasificar hallazgos.
4. Confirmar scripts minimos:
   - Backend: `start`, `dev`, `test`, `db:migrate` corregido.
   - Frontend: `dev`, `build`, `preview`.
   - Movil: `start`, `android`, `ios`.
5. Definir version Node objetivo para Render y desarrollo local.

Criterios de cierre:

- Instalacion reproducible sin dependencias flotantes criticas.
- `npm run build` pasa en frontend.
- `node --check` pasa en archivos backend modificados.
- `AuditLock` actualizado con archivos y checks.

### Fase 2: GitHub y rama de trabajo

Objetivo: configurar una rama lista para subida controlada.

Acciones:

1. Resolver `safe.directory` de Git si el entorno lo requiere.
2. Crear rama `codex/haiky-render-legal-plan` o rama aprobada por OWNER.
3. Revisar `.gitignore` para excluir `.env`, secretos, builds y caches.
4. Crear commits por fase con formato:
   - `phase: 0`
   - `task: 0.1 plan y auditlock inicial`
5. Preparar push remoto sin publicar secretos.

Criterios de cierre:

- Rama creada.
- Estado Git limpio salvo cambios aprobados.
- Commits trazables por fase.

### Fase 3: PostgreSQL y base de datos

Objetivo: crear una base PostgreSQL local y preparar equivalencia para Render.

Acciones:

1. Definir nombre de base: `plan_haiky`.
2. Crear roles separados:
   - `haiky_app`: conexion runtime.
   - `haiky_migration`: migraciones.
   - `haiky_readonly`: auditoria y soporte.
3. Habilitar extensiones requeridas:
   - `uuid-ossp` o `pgcrypto`.
   - `pgcrypto` para cifrado de cuentas bancarias si se mantiene en DB.
4. Crear `.env` local desde `backend/.env.example`.
5. Validar conexion con `pg`.
6. Documentar backup, restore y rotacion de credenciales.

Criterios de cierre:

- Base local creada.
- Usuario runtime sin privilegios de propietario.
- Conexion backend validada.
- Variables documentadas para Render.

### Fase 4: Migraciones y decision Prisma

Objetivo: resolver la brecha entre el requerimiento Prisma y el backend actual.

Decision requerida:

- Opcion A: introducir Prisma como ORM y fuente de migraciones.
- Opcion B: mantener `pg` directo y crear migrador SQL formal.

Recomendacion: si el objetivo explicito es "migrar esquema prisma", adoptar Opcion A, pero hacerlo como cambio controlado porque afecta modelos, queries y despliegue.

Acciones para Opcion A:

1. Instalar `prisma` y `@prisma/client`.
2. Crear `backend/prisma/schema.prisma`.
3. Mapear entidades actuales: tenants, usuarios, empleados, marcaciones, novedades, nominas, documentos, auditoria y sesiones.
4. Crear migracion inicial con `npx prisma migrate dev --name init`.
5. Generar cliente con `npx prisma generate`.
6. Definir estrategia de convivencia temporal con `pg` directo.

Acciones para Opcion B:

1. Crear `backend/src/config/schema.sql`.
2. Crear `backend/src/config/migrate.js`.
3. Registrar tabla `schema_migrations`.
4. Documentar rollback por version.

Criterios de cierre:

- Una sola estrategia de migracion aprobada.
- Migracion ejecutada en base local.
- Rollback documentado.
- No hay estados paralelos de esquema.

### Fase 5: Render y servicios requeridos

Objetivo: definir arquitectura minima para subir a Render.

Servicios recomendados:

- Render PostgreSQL: base principal.
- Backend API Web Service:
  - Root: `backend`.
  - Build: `npm ci`.
  - Start: `npm start`.
  - Variables: DB, JWT, CORS, S3 o storage equivalente.
- Frontend Static Site:
  - Root: `frontend-web`.
  - Build: `npm ci && npm run build`.
  - Publish: `dist`.
- Worker cron:
  - Root: `backend`.
  - Start: `npm run cron:start`.
  - Requiere mismas variables DB y observabilidad.
- Storage externo:
  - S3 compatible o alternativa aprobada para documentos PDF, XLSX, XML y archivos bancarios.
- Servicio de notificaciones futuro:
  - Email transaccional.
  - Push movil.

Cronograma sugerido:

| Semana | Entregable | Resultado |
|---|---|---|
| 1 | Dependencias, GitHub, DB local | Proyecto instala y conecta |
| 2 | Migraciones y seed minimo | Base reproducible |
| 3 | Legal, calculos y redondeos | Matriz validada con pruebas |
| 4 | Bancos, roles, SUPERADMIN/OWNERS | Seguridad operativa |
| 5 | Render staging | API, frontend y worker desplegados |
| 6 | Hardening y go-live | Monitoreo, backup y runbook |

Criterios de cierre:

- API desplegada en staging.
- Worker separado del API.
- Frontend consume URL publica de API.
- Backups y variables productivas documentadas.

### Fase 6: Cumplimiento legal Ecuador

Objetivo: revisar calculos, redondeos y proteccion de datos antes de produccion.

Alcance legal tecnico:

- Codigo del Trabajo: jornada, horas extra, decimos, vacaciones, finiquito, despido, desahucio.
- IESS: aporte personal y patronal, bases imponibles, reportes.
- SRI: retenciones y tabla de impuesto a la renta vigente.
- Proteccion de datos personales: base legitimadora, consentimiento cuando aplique, minimizacion, informacion al titular, seguridad, trazabilidad, derechos de acceso/rectificacion/eliminacion cuando no choque con obligaciones laborales o tributarias.

Acciones:

1. Convertir `docs/CUMPLIMIENTO_LEGAL.md` en matriz versionada por anio.
2. No hardcodear valores anuales sin fuente y vigencia.
3. Centralizar parametros legales por periodo fiscal.
4. Definir politica de redondeo:
   - Calculos monetarios internos en centavos o decimal exacto.
   - Redondeo final a 2 decimales por rubro.
   - Trazabilidad del valor antes y despues de redondeo.
5. Agregar pruebas de casos borde:
   - ingreso proporcional,
   - decimos acumulados y mensualizados,
   - horas extra 50% y 100%,
   - finiquito,
   - nomina cerrada inmutable.
6. Solicitar revision de abogado laboral/tributario ecuatoriano antes de produccion.

Criterios de cierre:

- Matriz legal actualizada con fuente y fecha.
- Parametros legales no dependen de valores quemados sin vigencia.
- Pruebas de calculo pasan.
- Riesgos legales abiertos documentados.

### Fase 7: Archivos planos bancarios

Objetivo: definir un esquema configurable para carga bancaria.

Modelo propuesto:

- Tabla o archivo versionado `bank_file_profiles`.
- Perfil por banco y tipo de archivo.
- Campos configurables:
  - `bankCode`
  - `delimiter`
  - `encoding`
  - `lineEnding`
  - `dateFormat`
  - `amountFormat`
  - `decimalSeparator`
  - `includeHeader`
  - `includeTrailer`
  - `accountSource`
  - `fieldMap`
  - `validationRules`

Validaciones obligatorias:

- Cuenta descifrada solo en memoria durante generacion.
- Mascara en logs, Excel de revision y UI.
- Total de trailer igual a suma de detalle.
- Numero de registros consistente.
- Archivo firmado o checksum para auditoria.
- Prohibido usar cuenta placeholder en produccion.

Criterios de cierre:

- Configuracion por banco documentada.
- Pichincha, Guayaquil y Produbanco como perfiles iniciales.
- Prueba con archivo de ejemplo anonimizado.
- Registro de auditoria por generacion.

### Fase 8: SUPERADMIN y OWNERS

Objetivo: verificar entorno de administracion y propiedad.

Acciones:

1. Definir roles minimos:
   - `SUPERADMIN`: operacion global, soporte tecnico, no debe ejecutar nomina de tenant salvo impersonacion auditada.
   - `OWNER`: propietario de tenant, gestiona usuarios, configuracion y cierres.
   - `ADMIN_RRHH`: operacion diaria de nomina y empleados.
   - `EMPLOYEE`: app movil y consulta propia.
2. Crear seed inicial seguro:
   - SUPERADMIN desde variables de entorno.
   - OWNER por tenant.
3. Bloquear usuarios por defecto en produccion.
4. Auditar acciones privilegiadas con `correlationId`, `userId`, `tenantId` y motivo.
5. Validar middleware `auth`, `tenantResolver` y reglas irrenunciables.

Criterios de cierre:

- Matriz RBAC aprobada.
- SUPERADMIN y OWNER no comparten credenciales.
- No existe bypass silencioso de tenant.
- Pruebas de autorizacion pasan.

## 3. Lista de comandos planificados

No ejecutar sin aprobacion de fase.

```powershell
cd backend
npm install
npm run test
```

```powershell
cd frontend-web
npm install
npm run build
```

```powershell
cd app-movil
npm install
npm start
```

```powershell
createdb plan_haiky
```

```powershell
cd backend
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

## 4. Riesgos que requieren decision del OWNER

- Confirmar si Prisma es obligatorio o si se acepta migrador SQL con `pg`.
- Confirmar proveedor de storage para documentos y archivos bancarios.
- Confirmar banco objetivo prioritario para archivo plano real.
- Confirmar si Render sera solo staging o produccion.
- Confirmar politica de retencion de marcaciones, fotos, ubicacion GPS y documentos laborales.
- Confirmar abogado o contador responsable de validar matriz legal.

## 5. Definicion de listo para subir a Render

El sistema esta listo para Render cuando:

- Instalacion usa `npm ci` con lockfiles.
- API inicia sin dependencia de archivos locales faltantes.
- Migracion DB es reproducible.
- Worker cron corre como proceso separado.
- Variables productivas estan documentadas y sin secretos en Git.
- Frontend compila y consume API por variable de entorno.
- SUPERADMIN y OWNER estan sembrados por flujo seguro.
- Matriz legal y redondeos tienen pruebas.
- Archivos bancarios no exponen cuentas completas.
- `AuditLock` esta firmado para todas las fases completadas.

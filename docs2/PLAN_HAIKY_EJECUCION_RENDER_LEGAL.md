# Plan HAIKY de ejecución, Render, cumplimiento y parametrización

Fecha de revisión: 2026-06-12  
Repositorio: `C:\proyectos web\nuevo_nomina`  
Estado: segunda pasada documental

## 0. Reglas de gobierno

- Cada fase requiere aprobación explícita.
- Cada cierre de fase actualiza `.vscode/AuditLock.json`.
- Todo cambio se traza en commits.
- No se aceptan fallos silenciosos ni archivos con BOM.
- `Plan HAIKY` es metodología; el producto visible es `Nómina-Ec`.

## 1. Diagnóstico actualizado

Nómina-Ec ya tiene base técnica para backend, frontend, móvil, Prisma, PWA, auth y pagos. Sin embargo, aún no puede operar comercialmente como SaaS porque falta configuración funcional profunda.

Riesgos actuales:

- Parámetros legales incompletos o sin UI.
- Tipos de novedades no administrables por tenant.
- Estructura organizativa insuficiente.
- Jornadas, zonas y calendarios no configurables desde UI.
- RLS Render pendiente.
- PayPhone pendiente de sandbox/oficial.
- Falta onboarding de configuración.

## 2. Arquitectura de servicios Render

Servicios mínimos:

- API backend.
- Worker cron.
- Frontend PWA.
- PostgreSQL.
- Redis.
- Storage S3 compatible.
- Servicio de email transaccional.

Variables por ambiente:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PAYPHONE_*`
- `AWS_*`
- `BANK_ACCOUNT_ENCRYPTION_KEY`
- Variables de seed SUPERADMIN/OWNER solo en ejecución controlada.

## 3. Requisito de parametrización antes de Render productivo

Antes de producción, el sistema debe permitir configurar:

### Parámetros legales

- Año fiscal.
- Región.
- SBU.
- IR.
- IESS.
- Décimos.
- Vacaciones.
- Horas extra.
- Liquidación.
- Redondeos.
- Fuente oficial.
- Aprobación profesional.

### Novedades

- Tipo.
- Impacto en nómina.
- Impacto legal.
- Evidencia.
- Aprobación.
- Vigencia.
- Aplicabilidad.

### Organización

- Empresas.
- Sedes.
- Departamentos.
- Cargos.
- Centros de costo.
- Jerarquías.
- Responsables.

### Asistencia

- Zonas.
- Geocercas.
- Jornadas.
- Turnos.
- Calendarios.
- Tolerancias.
- Excepciones.

### Bancos

- Perfil de archivo.
- Cuenta fuente.
- Formato.
- Validación.
- Auditoría.

## 4. Fases de ejecución actualizadas

### Fase 28: Modelo común de parametrización

Crear tablas, API y UI base para catálogos globales y catálogos por tenant.

### Fase 29: Legal Ecuador parametrizable

Administrar parámetros legales con vigencia, fuente y aprobación.

### Fase 30: Organización y centros de costo

Permitir modelar la empresa real del cliente.

### Fase 31: Jornadas, zonas y calendarios

Parametrizar asistencia y geocercas.

### Fase 32: Novedades y flujos

Configurar novedades, impactos y aprobaciones.

### Fase 33: Onboarding OWNER

Crear asistente de configuración mínima para tenant nuevo.

### Fase 34: Render staging productizable

Desplegar con datos de prueba, RLS no superusuario, PayPhone sandbox y smoke completo.

## 5. Cronograma recomendado

| Semana | Entregable | Resultado |
|---|---|---|
| 1 | Núcleo de parametrización | Catálogos y auditoría configurables |
| 2 | Legal y novedades | Parámetros y tipos operativos por tenant |
| 3 | Organización, jornadas y zonas | Tenant puede modelar operación real |
| 4 | Onboarding y UX | OWNER configura sin soporte técnico |
| 5 | Render staging | API, PWA, worker, DB y Redis con smoke |
| 6 | QA legal/comercial | Evidencia para demo controlada |

## 6. Definición de listo para Render productivo

El sistema estará listo cuando:

- El frontend compila y la PWA tiene UI profesional.
- La API inicia sin dependencias locales.
- Migraciones Prisma son reproducibles.
- Worker corre separado.
- RLS está probado en Render con usuario no superusuario.
- Parámetros legales están versionados y aprobados.
- El OWNER puede configurar tenant sin tocar código.
- Tipos de novedades y jornadas afectan nómina correctamente.
- Zonas de marcación operan con reglas auditadas.
- PayPhone está probado en sandbox/oficial.
- Pruebas de RBAC, cálculos, bancos y aislamiento pasan en CI.

## 7. Bloqueos de producción

- No comercializar sin parametrización mínima.
- No declarar cumplimiento legal sin aprobación profesional.
- No activar self-service sin RLS Render comprobado.
- No procesar pagos reales sin PayPhone sandbox/oficial validado.
- No calcular nómina real con parámetros en estado borrador o pendiente.

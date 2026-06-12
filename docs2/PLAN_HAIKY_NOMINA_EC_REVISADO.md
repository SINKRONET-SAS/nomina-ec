# Plan HAIKY revisado - Nómina-Ec parametrizable

Fecha de revisión: 2026-06-12  
Repositorio: `SINKRONET-SAS/nomina-ec`  
Stack vigente: Node.js, Express, PostgreSQL, Prisma, React, Expo, Render

## 1. Criterio de revisión

Nómina-Ec debe evolucionar de boceto funcional a SaaS parametrizable. La arquitectura se mantiene sobre el stack actual; no se migra a Base44 ni se reemplaza el backend Express.

La prioridad cambia de "tener pantallas y cálculos" a "permitir configurar correctamente la operación de cada empresa".

## 2. Estado real

Existe:

- Backend Express con PostgreSQL y Prisma para migraciones.
- Frontend React + Vite + PWA.
- App móvil Expo.
- Registro, login, recuperación, planes y PayPhone/mock en primera versión.
- Parámetros legales parcialmente versionados.
- RLS definida en migraciones, pendiente de prueba en Render.

Brechas críticas:

- Falta núcleo de parametrización.
- Falta UI administrativa para parámetros legales.
- Falta catálogo editable de novedades.
- Falta estructura organizativa real.
- Falta configuración de zonas, jornadas y calendarios.
- Falta onboarding del OWNER para configurar el tenant.
- Falta smoke end-to-end comercial.

## 3. Modelo objetivo de configuración

### 3.1 Catálogos globales

Administrados por SUPERADMIN:

- Países, provincias, ciudades y regiones laborales.
- Feriados nacionales y locales.
- Parámetros legales oficiales por año.
- Bancos y perfiles base de archivos.
- Tipos base de contrato.
- Tipos base de jornada.
- Tipos base de novedades.
- Roles y permisos del sistema.

### 3.2 Catálogos por tenant

Administrados por OWNER o ADMIN_RRHH autorizado:

- Empresas, sucursales, sedes y centros de costo.
- Departamentos, cargos y equipos.
- Jornadas y turnos.
- Zonas de marcación.
- Novedades habilitadas.
- Flujos de aprobación.
- Bancos utilizados.
- Plantillas documentales.

### 3.3 Reglas comunes

Todo catálogo sensible debe tener:

- Estado.
- Vigencia.
- Auditoría.
- Usuario creador y aprobador.
- Compatibilidad con nóminas cerradas.
- Importación/exportación controlada.
- Validación por rol.

## 4. Fases HAIKY revisadas

### Fase 0 a 27

Se mantienen como base ejecutada o planificada: preparación, dependencias, PostgreSQL, Prisma, Render, legal, bancos, RBAC, landing, PWA, auth, planes y PayPhone.

### Fase 28: Núcleo de parametrización

Objetivo: crear patrón común para parámetros y catálogos.

Entregables:

- Migración Prisma para tablas base de configuración.
- Servicio backend de catálogos.
- Pantalla administrativa inicial.
- Auditoría de cambios.

### Fase 29: Parámetros legales

Objetivo: administrar parámetros legales desde DB con fuente y vigencia.

Entregables:

- Tabla de parámetros legales.
- Estados de validación.
- Pantalla de revisión y aprobación.
- Bloqueo de cálculo productivo si falta aprobación.

### Fase 30: Tipos de novedades

Objetivo: permitir que cada tenant configure novedades y su impacto.

Entregables:

- Catálogo de novedades.
- Impacto por rubro.
- Reglas de aprobación.
- Pruebas de cálculo con novedades.

### Fase 31: Estructura organizativa

Objetivo: modelar empresa, sedes, áreas, cargos y centros de costo.

Entregables:

- CRUD de estructura.
- Asignación histórica de empleados.
- Reportes por centro de costo.

### Fase 32: Zonas, jornadas y calendarios

Objetivo: parametrizar asistencia.

Entregables:

- Jornadas y turnos.
- Calendarios y feriados.
- Geocercas.
- Reglas de tolerancia y atraso.

### Fase 33: Onboarding operativo

Objetivo: guiar al OWNER hasta dejar el tenant listo.

Entregables:

- Checklist inicial.
- Bloqueos suaves por configuración incompleta.
- Indicador de preparación operativa.

### Fase 34: QA end-to-end

Objetivo: validar que el sistema ya se puede demostrar comercialmente.

Flujo mínimo:

1. Registro de empresa.
2. Configuración legal.
3. Estructura organizativa.
4. Jornada y zona.
5. Empleado.
6. Marcación.
7. Novedad.
8. Nómina.
9. Archivo bancario.
10. Pago de plan.

## 5. Prioridad recomendada

1. Fase 28: núcleo de parametrización.
2. Fase 29: parámetros legales.
3. Fase 31: estructura organizativa.
4. Fase 32: jornadas y zonas.
5. Fase 30: novedades configurables.
6. Fase 33: onboarding.
7. Fase 34: QA comercial.

## 6. Criterio de listo para producción

- La configuración mínima se completa desde UI.
- Los parámetros legales tienen fuente y aprobación.
- Cada novedad tiene impacto definido.
- Cada empleado pertenece a estructura, jornada y zona vigentes.
- RLS Render está probado con usuario no superusuario.
- PayPhone sandbox/oficial está validado.
- CI ejecuta pruebas de RBAC, cálculos, bancos y aislamiento tenant.

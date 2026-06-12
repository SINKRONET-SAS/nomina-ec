# Plan HAIKY - Plataforma comercial, PWA, auth, PayPhone y parametrización para Nómina-Ec

Fecha de revisión: 2026-06-12  
Repositorio objetivo: `C:\proyectos web\nuevo_nomina`  
Estado: segunda pasada documental. El sistema sigue en etapa de boceto funcional y requiere parametrización antes de comercialización.

## 1. Regla de alcance

`Plan HAIKY` es metodología interna. El producto visible es `Nómina-Ec`.

Este plan no autoriza cambios runtime por sí solo. Antes de ejecutar una fase se debe leer `RULES.md`, validar `.vscode/AuditLock.json` y cerrar la fase anterior con evidencia. La activación productiva sigue bloqueada por RLS Render, validación legal profesional e integración PayPhone sandbox/oficial.

## 2. Cambio de criterio

La segunda pasada cambia el foco:

- De pantallas públicas aisladas a experiencia comercial operable.
- De valores quemados a catálogos parametrizables por tenant, año, vigencia y fuente.
- De nómina como cálculo único a plataforma de control laboral: organización, jornadas, zonas, novedades, aprobaciones, bancos, documentos y auditoría.
- De demo visual a acciones reales conectadas a API, con estados visibles y errores comprensibles.

## 3. Módulos parametrizables obligatorios

### 3.1 Parámetros legales

Debe existir un módulo de administración legal con vigencias por país, año fiscal, región y fuente.

Parámetros mínimos:

- SBU por año.
- Tabla de Impuesto a la Renta por año.
- Aportes IESS personales y patronales por tipo de relación.
- Décimo tercero y décimo cuarto: forma de acumulación, región y reglas de pago.
- Vacaciones: días base, antigüedad, proporcionales y topes.
- Horas extra y suplementarias: recargos, franjas, feriados y nocturnidad.
- Indemnización, desahucio y rubros de liquidación.
- Redondeos por rubro: cálculo interno, presentación, pago bancario y asiento contable.
- Estados de validación: `borrador`, `pendiente_validacion_oficial`, `validado_fuente_oficial`, `aprobado_profesional`, `bloqueado`.

Cada parámetro debe guardar:

- `countryCode`, `periodYear`, `regionCode`, `validFrom`, `validTo`.
- `value`, `unit`, `roundingMode`, `sourceName`, `sourceUrl`, `sourceDate`.
- `approvedBy`, `approvedAt`, `approvalNotes`.
- Historial de cambios y auditoría.

### 3.2 Tipos de novedades

Las novedades no deben estar quemadas en código. Deben administrarse como catálogo por tenant con una base global sugerida.

Campos mínimos:

- Código, nombre, descripción y estado.
- Tipo: ingreso, descuento, ausencia, permiso, subsidio, préstamo, anticipo, ajuste, hora extra, feriado, incapacidad, comisión.
- Impacto en nómina: suma, resta, informativo, no remunerado.
- Afecta IESS, IR, décimos, vacaciones, provisiones y pago bancario.
- Requiere documento, evidencia, aprobación, doble aprobación o comentario obligatorio.
- Flujo de aprobación por rol y monto.
- Vigencia y aplicabilidad por departamento, cargo, sede, jornada o contrato.

### 3.3 Estructura organizativa

Nómina-Ec debe permitir que cada tenant modele su organización real.

Catálogos mínimos:

- Empresas o razones sociales dentro del tenant.
- Sucursales, sedes y centros de costo.
- Departamentos, áreas, equipos y cargos.
- Líneas jerárquicas y responsables de aprobación.
- Relación empleado-cargo-sede-centro de costo con vigencia.
- Códigos contables opcionales para reportes y exportaciones.

El diseño debe soportar cambios históricos sin alterar nóminas cerradas.

### 3.4 Zonas, geocercas y puntos de marcación

El control de asistencia debe ser configurable.

Campos mínimos:

- Zona o sede.
- Coordenadas, radio, precisión mínima y tolerancia.
- Horarios permitidos por jornada.
- Reglas de foto, GPS, offline, dispositivo y biometría futura.
- Excepciones por cargo, empleado, permiso o teletrabajo.
- Estado de zona: activa, suspendida, solo lectura.

### 3.5 Jornadas, turnos y calendarios

La jornada debe modelarse como regla parametrizable, no como horario fijo.

Campos mínimos:

- Tipo de jornada: ordinaria, parcial, rotativa, nocturna, especial, teletrabajo, confianza.
- Horas esperadas por día y semana.
- Hora de entrada, salida, descanso, tolerancia y redondeo de marcación.
- Calendario de feriados nacionales, locales y empresariales.
- Reglas de atraso, salida temprana, ausencia, horas extra y compensación.
- Asignación por empleado con vigencia.

### 3.6 Bancos y archivos planos

Los perfiles bancarios deben ser catálogos versionados por banco.

Campos mínimos:

- Banco, tipo de archivo, delimitador, codificación, fin de línea.
- Estructura de encabezado, detalle y trailer.
- Formato de monto, fecha, cuenta, identificación y referencia.
- Reglas de validación y checksum.
- Cuenta descifrada solo en memoria durante generación.
- Plantillas por banco y evidencia de prueba anonimizada.

### 3.7 Planes comerciales y PayPhone

Los planes comerciales deben gobernar capacidades, no solo precio.

Límites mínimos:

- Empleados activos.
- Empresas/sucursales.
- Usuarios administrativos.
- Periodos de nómina mensuales.
- Archivos bancarios.
- Documentos legales.
- Reportes.
- Almacenamiento.
- Soporte.
- Automatizaciones.

PayPhone debe operar como proveedor desacoplado:

- Checkout intent desde backend.
- Webhook/confirmación idempotente.
- Montos en centavos.
- IVA y referencias auditables.
- Modo mock solo para desarrollo.

## 4. Segunda pasada UX/UI requerida

La experiencia pública debe comunicar configuración y control, no solo acceso.

Pantallas prioritarias:

- Landing con propuesta de valor y captura de leads.
- Login profesional.
- Registro con empresa, OWNER, plan y consentimiento.
- Recuperación de contraseña.
- Planes con capacidades reales.
- Panel de configuración inicial post-registro.
- Asistente de parametrización: empresa, organización, jornada, zonas, novedades, legal y banco.

El primer acceso del OWNER debe guiar a completar:

1. Datos de empresa.
2. Parámetros legales vigentes.
3. Estructura organizativa.
4. Jornadas y calendarios.
5. Zonas de marcación.
6. Tipos de novedades.
7. Banco y perfil de archivo plano.
8. Usuarios y roles.

## 5. Fases nuevas sugeridas

### Fase 28: Núcleo de parametrización

Crear modelo de datos y pantallas base para catálogos globales y catálogos por tenant.

### Fase 29: Parámetros legales versionados

Mover parámetros legales a DB, con vigencia, fuente, responsable y bloqueo productivo.

### Fase 30: Organización, cargos y centros de costo

Crear estructura organizativa editable con vigencias históricas.

### Fase 31: Jornadas, calendarios y zonas

Crear reglas de asistencia, geocercas y asignaciones por empleado.

### Fase 32: Novedades configurables

Crear catálogo de novedades, impactos de nómina y flujos de aprobación.

### Fase 33: Onboarding operativo del OWNER

Convertir configuración inicial en asistente guiado.

### Fase 34: QA comercial y smoke end-to-end

Probar registro, configuración mínima, empleado, marcación, novedad, nómina, banco y pago.

## 6. Criterios de cierre

- La marca visible es `Nómina-Ec`.
- La PWA carga CSS real y tiene UI comercial.
- Registro, login, recuperación, planes y PayPhone ejecutan acciones reales.
- El sistema no depende de valores legales quemados para producción.
- El OWNER puede configurar empresa, estructura, jornadas, zonas, novedades y bancos.
- Cada configuración tiene vigencia, auditoría y control por rol.
- Las nóminas cerradas no cambian aunque se modifiquen parámetros futuros.

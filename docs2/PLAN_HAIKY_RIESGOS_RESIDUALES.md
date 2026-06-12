# Plan HAIKY - Riesgos residuales y controles de parametrización

Proyecto: Nómina-Ec  
Fecha de revisión: 2026-06-12  
Estado: segunda pasada documental

## 1. Regla de ejecución

Antes de ejecutar cualquier fase se debe leer `RULES.md`, validar `.vscode/AuditLock.json` y cerrar el candado con evidencia. Este documento no sustituye una validación legal, tributaria, laboral ni de seguridad.

## 2. Riesgo principal actualizado

El riesgo mayor ya no es únicamente técnico. El sistema todavía es un boceto porque no permite parametrizar de forma suficiente:

- Valores legales.
- Tipos de novedades.
- Estructura organizativa.
- Zonas de marcación.
- Jornadas y calendarios.
- Bancos.
- Flujos de aprobación.
- Planes comerciales.

Sin parametrización, Nómina-Ec no puede venderse como SaaS multiempresa porque cada cliente tendrá reglas, sedes, jornadas y procesos distintos.

## 3. Riesgos residuales

### Riesgo 1: valores legales 2026

Estado: parcialmente reconfirmado, con bloqueo productivo pendiente.

Controles:

- Mantener estados por parámetro: `pendiente_validacion_oficial`, `validado_fuente_oficial`, `aprobado_profesional`.
- Bloquear cálculos productivos cuando falte fuente o aprobación.
- Guardar fuente, fecha, responsable y evidencia.
- Versionar cada cambio por año y vigencia.

### Riesgo 2: parametrización legal insuficiente

Estado: abierto.

Controles:

- Crear tablas de parámetros legales con vigencia.
- Crear pantallas de administración solo para SUPERADMIN y roles autorizados.
- Permitir override por tenant únicamente cuando sea legalmente válido y auditado.
- No permitir editar parámetros usados por nóminas cerradas; crear nueva versión.

### Riesgo 3: novedades rígidas

Estado: abierto.

Controles:

- Catálogo configurable de novedades.
- Definir impacto en nómina, IESS, IR, décimos, vacaciones y bancos.
- Definir flujo de aprobación por rol, monto, cargo o sede.
- Registrar evidencia obligatoria cuando aplique.

### Riesgo 4: estructura organizativa plana

Estado: abierto.

Controles:

- Modelar empresa, sucursal, sede, departamento, área, equipo, cargo y centro de costo.
- Usar vigencias para cambios de cargo, área o centro de costo.
- Reportar nómina por estructura histórica del periodo.

### Riesgo 5: zonas y jornadas insuficientes

Estado: abierto.

Controles:

- Configurar geocercas por sede.
- Configurar jornadas por empleado o grupo.
- Modelar tolerancias, descansos, feriados, turnos y excepciones.
- Auditar cambios de jornada y zona.

### Riesgo 6: RLS Render sin evidencia

Estado: pendiente.

Controles:

- Ejecutar prueba con usuario no superusuario.
- Registrar evidencia sin secretos.
- Bloquear self-service comercial hasta comprobar aislamiento tenant.

### Riesgo 7: PayPhone sin sandbox real

Estado: pendiente.

Controles:

- Validar credenciales sandbox.
- Verificar firma de webhook si PayPhone la provee.
- Probar idempotencia y conciliación.
- No exponer secretos al cliente.

### Riesgo 8: UX comercial insuficiente

Estado: en corrección.

Controles:

- Mantener UI profesional en landing, auth, planes y onboarding.
- Agregar asistente de configuración inicial.
- Ejecutar smoke visual desktop/móvil.

## 4. Fases de cierre recomendadas

### Fase 28: Catálogos base y gobierno de configuración

Crear modelo común para catálogos globales y por tenant con vigencia, estado, auditoría y permisos.

### Fase 29: Parámetros legales versionados

Migrar SBU, IR, IESS, décimos, vacaciones, horas extra y liquidación a DB.

### Fase 30: Novedades configurables

Crear catálogo editable y reglas de impacto en nómina.

### Fase 31: Organización y centros de costo

Modelar estructura y relaciones históricas de empleados.

### Fase 32: Jornadas, zonas y calendarios

Crear reglas de asistencia parametrizables.

### Fase 33: Onboarding de configuración

Guiar al OWNER para dejar el tenant operable antes de cargar empleados.

### Fase 34: QA productizable

Probar flujo completo con tenant de muestra, parámetros reales, empleado, marcación, novedad, nómina, banco y pago.

## 5. Criterio de no comercialización

No comercializar si ocurre cualquiera de estas condiciones:

- RLS Render no probado.
- Parámetros legales productivos sin fuente y aprobación.
- No existe configuración de jornadas, zonas y novedades.
- No existe flujo claro para configurar organización.
- PayPhone no probado en sandbox/oficial.
- La PWA conserva pantallas en bruto o sin acción real.
- No hay pruebas de RBAC y aislamiento tenant.

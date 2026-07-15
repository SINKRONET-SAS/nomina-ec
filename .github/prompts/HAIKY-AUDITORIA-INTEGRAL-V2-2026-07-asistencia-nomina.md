# AIV2-07 - Asistencia parametrizable y nomina base 30

## Estado

Ejecutado y validado el 2026-07-14.

## Objetivo

Corregir la interpretacion de asistencia mensual sin convertir la ausencia de marcaciones en falta, habilitar registros manuales diarios/mensuales con alcance individual/global, parametrizar por empleado la participacion en asistencia, normalizar el prorrateo de nomina a 30 dias y exponer un listado maestro vertical de empleados.

## Reglas

1. Mantener las marcaciones en fechas calendario reales y la nomina sobre base mensual de 30 dias.
2. Solo una novedad aprobada puede generar descuento por falta.
3. No bloquear nomina por zona, GPS o jornada cuando `controla_asistencia` esta desactivado.
4. No reemplazar marcaciones existentes ni aceptar fechas futuras o periodos cerrados.
5. Aplicar RBAC, usuario fresco, tenant, transaccion, auditoria y mensajes funcionales.
6. No exponer cuenta bancaria en el listado maestro.

## Ejecucion

- Crear migracion y check en ficha de empleado.
- Aplicar el control en app de asistencia, carga global y diagnostico previo a nomina.
- Implementar asistencia manual para un dia, mes o rango; un empleado o todos.
- Separar agregados de marcaciones y novedades en el reporte mensual.
- Corregir seleccion de empleados ingresados durante el mes y prorrateo 30/30.
- Incorporar exportacion XLSX vertical de empleados.
- Validar timezone `America/Guayaquil`, UTF-8, Prisma, contratos, backend, PWA y mobile.

## Criterio de cierre

- Suite backend completa en verde.
- Build PWA en verde.
- Migracion local aplicada sin error.
- Smoke XLSX contra PostgreSQL local.
- `git diff --check` sin errores.

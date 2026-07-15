# AIV28-01 - Motor de calculo: validaciones y batch

## Plan
HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

## Objetivo
Corregir hallazgos H-01 (fallas silenciosas en batch) y H-02 (sin validacion dias=0) en el motor de calculo de nomina.

## Tareas

1. **H-01**: En `calculoNominaService.js`, despues del bucle de empleados, determinar estado del batch:
   - `completed`: todos los empleados calculados sin error.
   - `partial_failed`: algunos empleados con error, otros exitosos.
   - `failed`: todos los empleados con error.
   - Actualizar el registro `PayrollCalculationBatch` con el estado correcto.
   - Incluir `totalErrores` y `totalCalculadas` en el resultado.

2. **H-02**: En `calculoNominaService.js`, despues de calcular `diasTrabajados`:
   - Si `diasTrabajados <= 0`, registrar log informativo y continuar al siguiente empleado.
   - No lanzar error (el empleado no aplica para el periodo, no es un fallo).
   - No generar registro de nomina para ese empleado.

3. Agregar tests en `calculoNominaService.batch.test.js`:
   - Test: batch con errores parciales reporta `partial_failed`.
   - Test: batch con todos los errores reporta `failed`.
   - Test: empleado con fecha ingreso posterior al periodo se excluye.

4. Ejecutar suite completa: `npx jest --runInBand`.

## Criterios de aceptacion

- Tests existentes pasan sin regresion.
- Nuevos tests cubren los 3 escenarios.
- No se modifican formulas de calculo legal.
- RULES.md: zero silent failures, zero regresiones.

## Archivos afectados

- `backend/src/services/calculoNominaService.js`
- `backend/src/services/calculoNominaService.batch.test.js`

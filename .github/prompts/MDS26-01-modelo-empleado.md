# MDS26-01 - Modelo empleado

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: agregar campos `modalidad_decimo_tercero` y `modalidad_decimo_cuarto` al modelo de empleados, con valores `mensual` o `acumulado` (default `acumulado`).

Tareas:

- Agregar columnas `modalidad_decimo_tercero` y `modalidad_decimo_cuarto` en tabla `empleados` con default `acumulado`.
- Agregar CHECK constraint: solo `mensual` o `acumulado`.
- Actualizar `empleadoController.js`: normalizar y validar los nuevos campos en create/update.
- Incluir campos en `buildCreatePayload` y `buildUpdatePayload` del frontend.
- Actualizar queries de SELECT empleado que alimentan nomina.

Cierre:

- Campos existen en DB con constraint y default.
- Controller valida y persiste sin romper API existente.

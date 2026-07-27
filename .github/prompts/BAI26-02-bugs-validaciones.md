# BAI26-02 - Bugs y validaciones

- **Plan**: `HAIKY-BENEFICIOS-ANTICIPOS-INTEGRAL-2026`
- **Codigo fase**: `BAI26-02`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `BAI26-01` firmado

## Objetivo

Corregir bugs de validacion, race conditions y fugas silenciosas en el modulo de beneficios.

## Tareas

### BAI26-02-T1: cuotaMensual <= montoTotal

- Backend: agregar validacion en `normalizePayload()` de `beneficioEmpleadoService.js`:
  ```javascript
  if (cuotaMensual > montoTotal) {
    throw new AppError('La cuota mensual no puede ser mayor al monto total.');
  }
  ```
- Frontend: agregar validacion inline en Beneficios.jsx antes de submit.

### BAI26-02-T2: Verificar empleado activo en approve/update

- Llamar `assertEmployeeInTenant()` en `approveBenefit()` y `updateBenefit()`.
- Error claro: "El empleado fue desactivado. No se puede aprobar/modificar el beneficio."

### BAI26-02-T3: UPSERT en decideLine

- Refactorizar `advancePayrollService.js:342-366` para usar `INSERT ... ON CONFLICT` en vez de SELECT + INSERT.
- Eliminar race condition entre consulta de existencia e insercion.

### BAI26-02-T4: Boton Cancelar y auto-clear mensajes

- Agregar boton "Cancelar" al formulario cuando `editingId` tiene valor.
- onClick: resetear form a `emptyForm()`, limpiar `editingId`.
- Auto-clear de mensajes de exito despues de 5 segundos con `setTimeout`.

### BAI26-02-T5: FK ON DELETE RESTRICT

- Nueva migracion: cambiar `beneficios_empleados.empleado_id` FK de `ON DELETE CASCADE` a `ON DELETE RESTRICT`.
- Esto previene eliminacion accidental de empleados con beneficios activos.

## Archivos a modificar

- `backend/src/services/beneficioEmpleadoService.js`
- `backend/src/services/advancePayrollService.js`
- `backend/prisma/migrations/` (nueva)
- `frontend-web/src/pages/Nomina/Beneficios.jsx`

## Validacion de cierre

- [ ] cuotaMensual > montoTotal rechazado en backend y frontend
- [ ] Empleado inactivo no puede tener beneficio aprobado
- [ ] decideLine idempotente sin race condition
- [ ] Boton Cancelar funcional
- [ ] Mensajes se limpian a los 5 segundos
- [ ] FK RESTRICT activa
- [ ] Backend tests PASS

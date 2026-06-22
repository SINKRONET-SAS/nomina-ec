# E2E26-07 - Calculo transaccional de nomina

Actua bajo `RULES.md`.

Objetivo: evitar que un periodo quede calculado si existen empleados con error o estado indebido.

Tareas:

- Validar AuditLock E2E26-06.
- Revisar calculoNominaService, nominaController, payroll_periods y estados.
- Exigir periodo abierto/calculable antes de calcular.
- Ejecutar calculo como transaccion de periodo.
- Registrar `calculation_failed` si falla cualquier empleado.
- Mostrar errores por empleado en PWA y bloquear cierre.
- Agregar tests de errores parciales y reintento.

Cierre:

- No existe periodo `calculated` con errores por empleado.
- Cierre queda bloqueado si el calculo no es completo.
- AuditLock firmado para E2E26-07.
- Commit esperado: `phase: E2E26-07 task: calculo transaccional`.

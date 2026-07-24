# NAR26-02 — Rol de anticipos y decisión mensual

Crear persistencia separada para corridas y líneas de rol de anticipos; no reutilizar la unicidad del rol mensual. La operación visible debe surgir de la misma ruta de Anticipos y préstamos, sin crear una pantalla paralela para bonificaciones. Validar empleados activos, periodo, montos positivos, tenant y estados.

Exponer listado, creación/edición previa al cierre, aprobación, cierre y evidencia. Al cierre permitir una decisión explícita por línea: `descontar` conserva el anticipo para deducción del rol mensual; `bonificar` crea o enlaza una novedad del mismo empleado/periodo y marca la línea como convertida. El usuario debe poder seleccionar el tipo de novedad parametrizado y escribir el nombre de la bonificación, ambos persistidos en la línea y en la novedad. Rechazar decisiones repetidas con idempotencia.

Auditar cada transición y proteger corridas cerradas. Mantener el cálculo mensual existente y agregar pruebas de integración de ambos caminos.

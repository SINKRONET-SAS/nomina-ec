# HCF26-04 — Usuarios delegados, permisos y DPA

Completa usuarios en nuevo_nomina tomando como referencia `sinkroniq-mobile`.

- Lista usuarios del tenant y muestra cuota del plan.
- Permite crear roles soportados dentro de la cuota, exigir DPA/LOPDP y auditar.
- Permite activar/desactivar sin borrar historia.
- Expone permisos por módulo con defaults y overrides existentes.
- Mantiene owner/superadmin irrestrictos y evita acceso cruzado entre tenants.
- Expone la función en navegación y pantalla con estados UI completos.
- Mantén compatibilidad con el endpoint de registro existente.

Gate: un owner gestiona un delegado desde UI y la operación queda visible en auditoría.


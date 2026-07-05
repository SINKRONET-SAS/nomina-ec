# GPA26-01 - Modelo de periodos

Agregar fechas desde/hasta a `payroll_periods` con migracion reversible y backfill. Actualizar Prisma sin cambiar la clave unica `tenant_id + anio + mes`.

Validar con `npx prisma validate`, `node --check` y `git diff --check`.

# REPORTE PNE26-01 - Contrato tecnico de datos y runtime

Estado: completed_local
Fecha: 2026-06-14

## Resultado

Se inventario el runtime real: el backend usa `pg` directo para operaciones de negocio y Prisma como fuente de esquema, migraciones y validacion estructural. Esta convivencia queda aceptada como contrato transicional: no se introducen nuevas tablas laborales sin migracion Prisma y rollback documentado.

## Evidencia

- `backend/prisma/schema.prisma` contiene el modelo canonico.
- `backend/src/app.js` expone endpoints laborales, configuracion, pagos, auditoria y auth.
- `backend/src/config/migrate.js` ejecuta `prisma migrate deploy`.
- `backend/src/config/database.js` conserva `pg` para consultas runtime.

## Decision

- Prisma gobierna schema y migraciones.
- `pg` directo permanece en servicios/controladores existentes hasta una migracion planificada por modulo.
- No se cambia contrato publico de API en esta fase.

## Validaciones

- `npx.cmd prisma validate`: pendiente de cierre global.
- `node --check` en archivos backend tocados: pendiente de cierre global.

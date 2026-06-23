# Reporte CRS26-02 - Modelo de datos y migracion

Fecha local: 2026-06-22.

## Cambios runtime

- Se agrego modelo Prisma `JobPosition` mapeado a `job_positions`.
- Se agrego relacion `Tenant.jobPositions`.
- Se agrego relacion `OrganizationUnit.jobPositions`.
- Se agrego `Employee.positionId` mapeado a `empleados.position_id`.
- Se creo migracion `20260623012500_crs26_job_positions`.

## Tabla `job_positions`

Campos principales:

- `tenant_id`
- `organization_unit_id`
- `code`
- `name`
- `description`
- `salary_min`
- `salary_max`
- `currency`
- `effective_from`
- `effective_to`
- `status`
- `metadata`
- auditoria de creacion/actualizacion

## Restricciones e indices

- FK `tenant_id -> tenants(id)` con cascada por tenant.
- FK `organization_unit_id -> organization_units(id)` con delete restrict.
- Check `salary_min >= 0`, `salary_max >= 0`, `salary_min <= salary_max`.
- Check de estado: `activo`, `inactivo`, `archivado`.
- Check de vigencia: `effective_to IS NULL OR effective_to >= effective_from`.
- Unique `(tenant_id, code)`.
- Indices por `(tenant_id, organization_unit_id, status)` y `(tenant_id, status, effective_from, effective_to)`.
- `empleados.position_id` con FK a `job_positions(id)` e indice `(tenant_id, position_id)`.
- RLS habilitado con policy `tenant_job_positions_policy` usando `app_current_tenant_id()`.

## Backfill local

La migracion creo cargos `LEGACY_*` desde `empleados.cargo` solo cuando pudo resolver unidad organizativa contra `organization_units`.

Resultado local:

- `jobPositions`: 12
- `linkedEmployees`: 30

Los cargos migrados quedan con metadata:

```json
{
  "source": "CRS26_migration",
  "reviewRequired": true,
  "employeeCount": 1
}
```

## Gates ejecutados

- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS, aplico `20260623012500_crs26_job_positions`.
- Smoke DB local: PASS, tabla creada y 30 empleados vinculados.

## Compatibilidad

`empleados.cargo` se conserva como snapshot historico. Los consumidores existentes aun pueden leerlo mientras CRS26-03..06 migran servicios, pantallas, importacion, reportes y novedades al cargo real.

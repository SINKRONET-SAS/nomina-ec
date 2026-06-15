# REPORTE CBN26-06 - Empresas y multi-tenant real

Estado: completed_by_stack_mapping
Fecha: 2026-06-14

## Resultado

El diagnostico indicaba uso de `empresas[0]`. En el stack actual no existe ese fallback en runtime. Los flujos revisados usan `req.tenantId` resuelto desde JWT y middleware:

- `backend/src/middleware/tenantResolver.js`
- `backend/src/middleware/auth.js`
- Controladores de empleados, nomina, marcaciones, beneficios, configuracion y reportes.

Se agrego `beneficios_empleados.tenant_id` con FK a `tenants` e indices por tenant/estado para mantener aislamiento en la nueva funcionalidad.

## Validacion

- `rg "empresas\\[0\\]" frontend-web/src backend/src app-movil` sin coincidencias.
- `npx prisma validate` paso.
- Beneficios CRUD filtra por `tenant_id`.

## Riesgo residual

Queda pendiente una prueba RLS Render con usuario no superusuario, ya documentada en planes anteriores.

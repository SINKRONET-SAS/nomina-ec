# Reporte CRS26-07 - Cierre QA y release gate

## Estado final

CRS26 queda ejecutado localmente de CRS26-00 a CRS26-07. El sistema ya cuenta con cargos/puestos por tenant, rango salarial, consumo de estructura organizativa, asignacion de empleados por `position_id`, validacion de sueldo, parametrizacion PWA, importacion masiva y consumidores de nomina/reportes/novedades.

## Gates ejecutados

- `npx.cmd prisma validate` en `backend`: PASS.
- `npx.cmd prisma migrate deploy` en `backend`: PASS, sin migraciones pendientes.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 28 suites y 114 tests.
- `npm.cmd run build` en `frontend-web`: PASS, PWA generated.
- Smoke DB local: `{"jobPositions":12,"linkedEmployees":30}`.

## Cierre funcional

- `job_positions` existe con indices, constraints, tenant, unidad organizativa, vigencia, estado y rango.
- `empleados.position_id` enlaza al cargo real.
- `empleados.cargo` queda como snapshot historico para documentos y compatibilidad.
- Parametrizacion PWA permite crear, editar, inactivar, archivar y eliminar si no hay consumos.
- Nuevo/editar empleado selecciona cargo real y bloquea sueldo fuera de rango.
- Importacion valida cargo y sueldo por fila antes del commit.
- Novedades por cargo aceptan id, codigo, nombre o snapshot historico.
- Reportes exportan codigo de cargo y cargo real con fallback historico.

## Rollback

Rollback funcional recomendado si se detecta una regresion antes de produccion:

1. Revertir commits CRS26-07 a CRS26-02 en orden inverso.
2. Si se requiere deshacer schema local, crear migracion compensatoria que remueva FK `empleados.position_id` y tabla `job_positions` solo despues de respaldar `empleados.cargo`.
3. No eliminar `empleados.cargo`; se conserva como fallback y evidencia historica.
4. Reejecutar `npx.cmd prisma validate`, `npx.cmd prisma migrate deploy`, backend tests y build PWA.

## Riesgos residuales

- Validacion visual con usuarios reales sigue recomendada antes de demo comercial.
- Si una empresa desea excepciones salariales por cargo, debe definirse una politica auditada futura; CRS26 implementa bloqueo duro.

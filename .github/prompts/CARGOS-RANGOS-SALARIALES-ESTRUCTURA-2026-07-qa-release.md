# CRS26-07 - QA, rollback y release gate

Actua bajo `RULES.md`.

Objetivo: cerrar CRS26 con evidencia, rollback y gates.

Tareas:

- Validar AuditLock CRS26-06.
- Ejecutar `npx.cmd prisma validate`.
- Ejecutar `npx.cmd prisma migrate deploy`.
- Ejecutar `npm.cmd test -- --runInBand` en backend.
- Ejecutar `npm.cmd run build` en frontend-web.
- Probar flujos: crear cargo, editar rango, bloquear delete con empleado, asignar empleado, importar empleado, generar reporte por cargo.
- Documentar rollback de migracion y riesgos residuales.
- Firmar AuditLock y cerrar plan.

Cierre:

- CRS26 queda cerrado localmente si todos los gates pasan.
- Commit esperado: `phase: CRS26-07 task: qa release cargos`.

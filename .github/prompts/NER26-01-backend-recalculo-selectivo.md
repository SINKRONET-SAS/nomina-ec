# NER26-01 - Backend de invalidacion y recalculo selectivo por empleado

Objetivo: permitir modificar/eliminar novedades de un empleado despues de invalidar solo su calculo, sin borrar calculos de otros empleados.

Instrucciones:
1. Leer `RULES.md`, `.vscode/AuditLock.json` y `docs/PLAN_HAIKY_NOVEDADES_EMPLEADO_RECALCULO_SELECTIVO_2026.md`.
2. Revisar `backend/src/controllers/novedadController.js`, `backend/src/controllers/nominaController.js`, `backend/src/services/monthlyPeriodService.js` y servicios de calculo/contabilidad relacionados.
3. Implementar servicio transaccional de invalidacion por empleado con filtros obligatorios `tenant_id`, `anio`, `mes`, `empleado_id`.
4. Agregar endpoint backend con RBAC existente y auditoria estructurada.
5. Asegurar que periodo cerrado retorne error explicito y no mute datos.
6. Agregar pruebas que demuestren que empleado B no se afecta al corregir empleado A.
7. No modificar contratos publicos existentes sin compatibilidad.
8. Actualizar AuditLock al cierre de fase.

Gates minimos:
- `node --check` en archivos JS modificados.
- Jest backend de novedades/nomina.
- `git diff --check`.
- UTF-8 sin BOM.

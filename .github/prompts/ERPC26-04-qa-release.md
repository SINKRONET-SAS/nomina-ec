# ERPC26-04 - QA, AuditLock y publicacion

Prerequisito: AuditLock ERPC26-03 firmado.

Objetivo: cerrar ERPC26 solo con evidencia real de ausencia de regresiones.

Tareas:
- Ejecutar pruebas focalizadas de comunicacion, nomina y PDF.
- Ejecutar suite backend completa, contratos, Prisma validate y build web.
- Ejecutar `git diff --check` y validar UTF-8 sin BOM de cada archivo modificado.
- Actualizar plan, `.github/CODEX_CONTEXT.md`, `.vscode/AuditLock.json` y el espejo raiz.
- Confirmar que el PDF individual, el nombre/logo del cliente, el pie y el envio manual permanecen operativos.
- Crear commit con `phase: ERPC26-04 task: email-roles-pago-cliente` y hacer push a la rama activa.

Gate: todos los checks PASS; cualquier regresion debe corregirse antes de firmar o publicar.

## Reejecucion correctiva 2026-08-06

- Regenerar los lockfiles independientes cuando CI reporte `npm ci` fuera de sincronizacion.
- Confirmar instalaciones limpias de backend, frontend y mobile, ademas de auditoria sin vulnerabilidades.
- Al reabrir un mes, liberar las lineas de calculo que marcaron novedades, anticipos o bonificaciones como consumidas.
- Revertir exclusivamente los descuentos de beneficios que fueron aplicados por ese cierre, conservando el historial de otros periodos.
- Exponer en la PWA los conteos restaurados y volver a ejecutar contratos, Prisma, suite backend y build web antes de publicar.

## Correccion productiva adicional 2026-08-06

- Confirmar en Render el commit efectivamente desplegado antes de atribuir el incidente a propagacion.
- Cubrir `descontar` y `bonificar_descontar`: al reaplicar una linea, reactivar el beneficio anulado sin duplicarlo y rechazar beneficios ya consumidos o incompatibles.
- Reparar datos existentes solo para roles activos de periodos no cerrados mediante migracion idempotente y rollback documentado.
- Mostrar en la PWA el estado y saldo del descuento vinculado.
- Si el rol mensual ya esta calculado en borrador, exigir un recalculo visible del empleado; no modificar totales ni evidencia de calculo directamente por migracion.
- Repetir prueba focalizada, backend completo, contratos, Prisma, build web, mobile readiness, UTF-8 y `git diff --check` antes de commit y push.

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

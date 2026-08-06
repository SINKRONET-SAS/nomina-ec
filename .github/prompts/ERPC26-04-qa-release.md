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

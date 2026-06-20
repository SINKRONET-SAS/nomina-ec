# CES26-06 - QA y cierre

## Objetivo

Cerrar CES26 con pruebas, migracion local, AuditLock firmado, commit y push.

## Tareas

1. Ejecutar `npx prisma validate`, `migrate deploy` y `generate`.
2. Ejecutar tests backend relevantes y suite completa si el tiempo lo permite.
3. Ejecutar build frontend.
4. Validar UTF-8 sin BOM/mojibake literal en archivos modificados.
5. Actualizar `.vscode/AuditLock.json`.
6. Commit con `phase: CES26-06 task: email smtp legal evidence`.
7. Push de la rama activa.

## Cierre

No dejar fases CES26 pendientes salvo bloqueos externos de credenciales y revision legal profesional.

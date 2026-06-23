# MRM26-08 - QA y release gate

Actua bajo `RULES.md`.

Objetivo: cerrar MRM26 con pruebas, migraciones, rollback, seed demo y evidencia para release.

Tareas:

- Ejecutar gates backend, frontend y Prisma definidos en el plan.
- Crear o actualizar seed demo con mercaderista y tres visitas en un dia.
- Probar Expo Go en la red local.
- Verificar rollback o estrategia de reverso para migraciones.
- Revisar UI para eliminar lenguaje Haiky/tecnico del producto final.
- Actualizar `CODEX_CONTEXT.md`, reportes y `.vscode/AuditLock.json`.

Cierre:

- Reporte `REPORTE_MRM26_08_CIERRE_QA.md`.
- AuditLock firmado.
- Commit esperado: `phase: MRM26-08 task: cierre qa rutas mercaderistas`.

# Prompts HAIKY por fase

Estos prompts ejecutan el plan por fases segun `RULES.md`.

Uso obligatorio:

1. Leer `.vscode/AuditLock.json`.
2. Confirmar que la fase anterior esta firmada.
3. Solicitar aprobacion explicita para iniciar la fase.
4. Ejecutar solo tareas de la fase aprobada.
5. Cerrar la fase actualizando `AuditLock.json`.
6. Preparar commit con `phase: <X>` y `task: <Y.Z>`.

No adelantar tareas de fases posteriores.

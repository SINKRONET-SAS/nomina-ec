# HU26-06 QA release SaaS

Objetivo: cerrar la segunda pasada HU26 con evidencia tecnica, documental y AuditLock.

Tareas:
- Ejecutar build PWA.
- Ejecutar pruebas backend del generador de plantillas legales.
- Ejecutar contratos del sistema.
- Ejecutar `git diff --check`.
- Validar UTF-8 sin BOM en archivos modificados.
- Actualizar `.vscode/AuditLock.json` con fase HU26-06, checks, archivos y firma.
- Commit con mensaje que incluya `phase: HU26-06` y `task: 06.QA`.
- Push a `main`.

Reglas:
- No incluir cambios ajenos no relacionados.
- Si un check falla por entorno y no por codigo, documentarlo con salida relevante.

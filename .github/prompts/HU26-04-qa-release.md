# HU26-04 QA release

Objetivo: cerrar HU26 con evidencia de build, UTF-8 y AuditLock.

Tareas:
- Ejecutar build PWA.
- Ejecutar `git diff --check` en rutas HU26.
- Validar UTF-8 sin BOM y sin mojibake en archivos HU26.
- Actualizar `AuditLock.json` con fase, archivos, checks y firma SHA-256.
- Commit con mensaje que incluya `phase: HU26-04` y `task: 04.QA`.
- Push a `main`.

Reglas:
- Staging explicito: no incluir URR26 ni cambios previos no relacionados.
- Si un check falla por cambios ajenos, documentar y no ocultar.

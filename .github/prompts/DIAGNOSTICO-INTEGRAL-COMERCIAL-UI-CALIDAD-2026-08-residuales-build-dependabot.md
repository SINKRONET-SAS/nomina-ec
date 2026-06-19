# DIC26-08 - Residuales build y Dependabot

## Objetivo

Cerrar las notas residuales posteriores al QA DIC26-07:

- Warning de Vite por chunk mayor a 500 kB.
- Vulnerabilidades reportadas por Dependabot/npm audit.

## Reglas

- No forzar upgrades que rompan peers de React/Vite.
- No introducir dependencias directas falsas solo para silenciar audit.
- Usar overrides para transitivas cuando el paquete directo no controla la version vulnerable.
- Mantener la PWA funcional y sin cache de datos personales de nomina.
- Validar frontend, backend y app movil antes de cerrar.

## Tareas

1. Ejecutar `npm audit` en `frontend-web`, `backend` y `app-movil`.
2. Actualizar dependencias directas vulnerables con versiones compatibles.
3. Agregar overrides transitivos necesarios.
4. Configurar `manualChunks` en Vite para eliminar el warning de chunk grande.
5. Ejecutar gates:
   - `npm.cmd audit --audit-level=low` en los tres workspaces.
   - `npm.cmd run build` y `npm.cmd run smoke:pwa` en `frontend-web`.
   - `npm.cmd test -- --runInBand` en `backend`.
   - `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil`.
6. Actualizar matriz, reporte y AuditLock.
7. Crear commit local `phase: DIC26-08 task: cerrar residuales build dependabot`.

## Criterio de cierre

- Cero vulnerabilidades auditables en los tres workspaces.
- Build frontend sin warning de chunk mayor a 500 kB.
- PWA, backend y app movil con gates PASS.
- Commit local creado sin push si el usuario lo instruye.

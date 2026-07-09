# URR26 03 - QA y release

Usar `.github/CODEX_CONTEXT.md` y `RULES.md`.

Objetivo: validar integridad, tests, AuditLock y push.

Tareas:

1. Ejecutar gates:
   - `npm.cmd --workspace=backend test -- app.routes.test.js --runInBand`
   - `npm.cmd --workspace=frontend-web run build`
   - `npm.cmd run contracts`
   - `git diff --check`
   - Validar UTF-8 sin BOM en archivos `.js`, `.jsx`, `.md`, `.json` modificados.

2. Actualizar `AuditLock.json`:
   - `phaseCompleted`: URR26-03
   - `filesModified`: lista de archivos cambiados
   - `validationChecks`: lista de gates que pasaron
   - `signature`: SHA256 del lock anterior + timestamp

3. Actualizar `.github/CODEX_CONTEXT.md`:
   - Cambiar estado URR26 a `completed-pass`.
   - Agregar gates ejecutados.

4. Commit con formato: `phase: URR26 task: usuarios-roles-rbac-modular`

5. Push a rama principal.

Gate: todos los gates verdes, commit y push exitosos.

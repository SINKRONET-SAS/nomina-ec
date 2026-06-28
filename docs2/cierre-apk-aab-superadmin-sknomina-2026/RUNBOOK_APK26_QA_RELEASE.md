# RUNBOOK APK26 - QA y release

## Preflight

1. Revisar `git status --short`.
2. Validar que los cambios no reviertan avances MSF26/CDANV6.
3. Confirmar que no se agregaron secretos ni anexos privados.

## Gates

1. `npm.cmd run contracts`
2. `npm.cmd run prisma:validate`
3. `npm.cmd --workspace=backend test -- --runInBand`
4. `npm.cmd --workspace=frontend-web run build`
5. `npm.cmd run check:mobile`
6. `npm.cmd --workspace=app-movil run doctor` si Expo CLI no requiere red externa bloqueada.
7. Verificar UTF-8 sin BOM en archivos modificados.
8. `git diff --check`

## Smoke manual recomendado

- Abrir `/dashboard/superadmin` con usuario superadmin y revisar cards, empresas, incidencias y tab de planes.
- Abrir app movil con token de empleado y verificar tabs operativos.
- Abrir app movil con owner/admin RRHH y verificar vista administrativa sin marcar asistencia como empleado.
- Ejecutar `npm.cmd run check:mobile` desde raiz para confirmar metadatos de tienda.

## Release

- Actualizar `.github/CODEX_CONTEXT.md`.
- Firmar `.vscode/AuditLock.json`.
- Commit: `phase: APK26-09 task: cierre play superadmin`
- Push a `origin main`.


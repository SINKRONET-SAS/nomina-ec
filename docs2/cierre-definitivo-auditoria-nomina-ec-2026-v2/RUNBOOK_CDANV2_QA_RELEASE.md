# Runbook CDANV2 - QA y release

## Preflight

1. Confirmar rama limpia o aislar cambios del usuario.
2. Leer `RULES.md`.
3. Leer `.vscode/AuditLock.json` y verificar firma de fase anterior.
4. Confirmar que `CODEX_CONTEXT.md` no existe en raiz.
5. Confirmar que `.github/CODEX_CONTEXT.md` contiene la linea CDANV2.

## Gates por fase

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd run test:backend`
- `npm.cmd run build:web`
- `npm.cmd run check:mobile`
- Pruebas especificas de la fase afectada.

## Smoke funcional requerido

- Auth: login, token, request autenticado y operacion critica con usuario fresco.
- Superadmin: overview, planes, incidencias o bloqueo visible.
- Seed: idempotencia, no secretos, no datos reales.
- Roles: descarga individual real y reporte consolidado si aplica.
- Cierre: doble request no produce doble cierre.
- Pagos: Stripe bloqueado o webhook real; PayPhone intacto.
- LOPDP: retencion/purga documentada y evidencia minimizada.

## Rollback

- Auth: conservar middleware compatible con tokens previos durante ventana de rotacion.
- Seed: no borrar superadmin existente; solo crear si falta.
- Reportes: no eliminar rutas existentes sin alias temporal.
- Cierre: no reabrir periodos cerrados automaticamente.
- Pagos: si webhook falla, deshabilitar Stripe y mantener PayPhone.

## Release

No liberar CDANV2 si queda algun P0 en estado `verificar_runtime`, `fallo_tests` o `bloqueado_sin_ui`.

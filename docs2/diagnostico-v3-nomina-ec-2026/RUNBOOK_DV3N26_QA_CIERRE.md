# Runbook DV3N26 - QA y cierre

## Precondiciones por fase

1. Leer `RULES.md`, `CODEX_CONTEXT.md`, `.vscode/AuditLock.json` y esta matriz.
2. Ejecutar `git status --short` y no mezclar cambios ajenos.
3. Confirmar aprobacion explicita del prompt de fase.
4. Verificar codigo real antes de modificar; mapear nombres Base44 a modulos reales.

## QA minimo por fase

- DV3N26-01: tests backend de bancos/nomina, caso sin nominas cerradas, caso pagada no modificable.
- DV3N26-02: tests liquidacion/fondo reserva, PDF o payload verificable, reporte visible.
- DV3N26-03: build PWA, navegacion a reportes/contabilidad, exportacion con datos de prueba.
- DV3N26-04: rutas publicas privacidad/terminos, consentimiento versionado y auditoria.
- DV3N26-05: pruebas unitarias de cifrado/descifrado, migracion idempotente, logs sin cuenta bancaria.
- DV3N26-06: smoke PWA, manifest, service worker, modo offline y API network-only/fail-closed.
- DV3N26-07: flujo SUT/MDT visible, bloqueo externo si no hay API/credenciales, documento de operacion manual.
- DV3N26-08: gates globales, UTF-8 sin BOM, diff check, AuditLock, reporte de cierre y commit/push.

## Gates finales

- `npx.cmd prisma validate` en `backend`.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` y `npm.cmd run smoke:pwa` en `frontend-web`.
- `npm.cmd run check:stores` y `npm.cmd run doctor` en `app-movil` si aplica.
- Gate UTF-8 sin BOM para archivos modificados.
- Revision manual de rutas y mensajes legales.

# Runbook AIV50 - QA y cierre definitivo

## Preparacion por fase

1. Leer `RULES.md`, `CODEX_CONTEXT.md`, `.vscode/AuditLock.json`, plan AIV50 y matriz AIV50.
2. Confirmar que el AuditLock anterior corresponde a la fase previa y esta firmado.
3. Ejecutar `git status --short` y no pisar cambios ajenos.
4. Verificar el hallazgo contra codigo real con `rg` y lectura directa.
5. Implementar solo el alcance de la fase aprobada.

## Gates por capa

### Backend

- `npx.cmd prisma validate` desde `backend`.
- `npm.cmd test -- --runInBand` desde `backend`.
- `node --check` en archivos JS tocados cuando aplique.
- Pruebas especificas para nomina, auth, marcaciones y parametros legales.

### Frontend/PWA

- `npm.cmd run build` desde `frontend-web`.
- Smoke PWA si existe script local.
- Verificar rutas afectadas: dashboard, login, registro, 404, configuracion legal.

### App movil

- `npm.cmd run doctor` desde `app-movil`.
- `npm.cmd run check:stores` desde `app-movil`.
- Validar pantallas de marcacion y permisos GPS en Expo/Android cuando haya entorno disponible.

### Legal/LOPDP

- Toda tasa legal debe incluir fuente, vigencia y responsable.
- Todo consentimiento debe registrar version, finalidad, fecha, canal y usuario/empleado cuando aplique.
- Si no hay validacion profesional, cerrar fase como `completed_local_with_professional_block`.

## Firma AuditLock

Al cerrar fase:

1. Calcular SHA256 del contenido anterior de `.vscode/AuditLock.json`.
2. Guardar `updatedAt` ISO local.
3. Firmar `SHA256(previousAuditLockHash + updatedAt)`.
4. Listar archivos modificados y checks ejecutados.
5. Registrar riesgos residuales sin ocultarlos.

## Rollback documental

- Fases de migracion deben incluir rollback SQL o script documentado.
- Refactors de rutas/servicios deben conservar paths publicos hasta cierre QA.
- Eliminaciones deben hacerse con `git mv`/`git rm` solo tras busqueda de usos.
# Evidencia de ejecucion de prompts HAIKY - 2026-06-12

## Alcance

Se reviso el contexto operativo adjunto para `Nomina-Ec` y el estado firmado del repositorio en la rama `codex/haiky-render-legal-plan`.

La ejecucion vigente queda cerrada hasta la fase 34:

- Fase 0 a fase 27: base tecnica, legal, Render, marca, PWA, auth, planes, PayPhone y QA comercial segun prompts existentes.
- Fase 28 a fase 34: nucleo de parametrizacion, parametros legales versionados, novedades configurables, estructura organizativa, zonas, jornadas, onboarding OWNER y QA end-to-end productizable.

## Validacion realizada

- `RULES.md` leido antes de tocar artefactos de gobierno.
- `.vscode/AuditLock.json` parseado y verificado como firmado en fase 34.
- Prompts disponibles revisados en `.github/prompts`.
- `CODEX_CONTEXT.md` revisado contra el contexto operativo adjunto.
- Se confirmo con Node que `CODEX_CONTEXT.md` se lee como UTF-8 valido y sin mojibake real en el encabezado operativo.
- `.codex/logs` se dejo fuera del commit por ser evidencia local de ejecucion y no fuente versionable del producto.

## Estado funcional

La fase 34 ya registra como aprobados:

- `npx prisma validate`.
- `npx prisma migrate deploy` sobre PostgreSQL local.
- `node --check` en servicios/controladores de configuracion.
- `npm test -- --runInBand` en backend.
- `npm run build` en `frontend-web`.
- `npx expo-doctor` en `app-movil`.
- Busqueda de mojibake en runtime y artefactos de gobierno.

## Riesgos que permanecen abiertos

- IESS Ecuador 2026 requiere validacion oficial/profesional antes de levantar el bloqueo productivo.
- Falta prueba RLS en Render con usuario no superusuario.
- Falta smoke visual manual completo con backend, frontend, mobile, PostgreSQL y Redis activos.
- Falta integrar la parametrizacion con nomina, marcaciones, bancos y reportes a profundidad.
- PayPhone requiere validacion sandbox/oficial con webhook, firma, conciliacion e idempotencia.

## Decision de cierre

No se ejecutaron cambios runtime adicionales en esta pasada. El objetivo de esta ejecucion fue consolidar evidencia de que los prompts disponibles quedaron ejecutados segun el contexto firmado y preparar el commit/push solicitado.

## Segunda pasada visual

Fuente: captura local en `http://127.0.0.1:5173/dashboard/configuracion/parametrizacion`.

Hallazgo:

- La pantalla de parametrizacion mostraba `Ruta no encontrada`, metricas en `...` y preparacion en `0%`.
- La causa probable se confirmo con llamadas directas: `http://127.0.0.1:3000/api/configuracion/resumen` existe y responde autenticacion, mientras `http://127.0.0.1:3000/configuracion/resumen` responde 404.

Correccion:

- Se agrego normalizacion centralizada de `VITE_API_URL` para aceptar `/api`, `http://host:puerto` o `http://host:puerto/api`.
- `AuthContext`, `publicApi` y `configurationApi` reutilizan la misma base normalizada.
- La pantalla de parametrizacion ya no queda en reintentos largos: muestra error claro y contadores estables si el resumen falla.

Validacion:

- `npm run build` en `frontend-web`: PASS.
- Verificacion UTF-8 de archivos frontend tocados: PASS.
- `node --check backend/src/app.js`: PASS.
- Verificacion directa de endpoint con `/api`: endpoint encontrado; token dummy devuelve rechazo de autenticacion esperado.

# Reporte AIV50-08 - Cierre runtime Auditoria Integral V50 Nomina-Ec 2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V50-NOMINA-EC-2026 |
| Codigo | AIV50 |
| Estado | AIV50-01..08 ejecutadas localmente |
| Fecha | 2026-06-21 |
| Repo | C:\proyectos web\nuevo_nomina |

## Cierre por fase

- AIV50-01: `calcularNominaMensual` carga parametros legales una sola vez por lote y `calcularEmpleado` acepta parametros precargados sin romper compatibilidad.
- AIV50-02: auth queda con rutas modulares, rate limit de 10 intentos por ruta/IP, `Retry-After`, login/refresh con columnas explicitas y validacion de foto base64 antes de S3.
- AIV50-03: parametros legales exponen fuente efectiva, detectan divergencias entre tabla legado y versionada, y bloquean en modo de validacion oficial.
- AIV50-04: `MarcacionScreen` verifica permiso GPS al cargar, bloquea marcacion sin permiso y muestra estado/reintento.
- AIV50-05: registro publico exige consentimiento LOPDP de tratamiento y registra auditoria versionada para OWNER.
- AIV50-06: PWA tiene 404 real, interceptor 401 con limpieza de sesion y dashboard visible de controles AIV50.
- AIV50-07: auth se extrajo a `backend/src/routes/authRoutes.js` como primer corte modular de bajo riesgo.
- AIV50-08: `AutoservicioScreen.js` no se elimina porque el codigo real lo usa en la tab `Perfil`; tests fuera de `test/` se conservan porque Jest los ejecuta y fueron ampliados como regresion.

## Gates ejecutados

- `npx.cmd prisma validate` en `backend`: PASS.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 24 suites y 89 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- `npm.cmd run doctor` en `app-movil`: PASS, 21/21 checks.
- `git diff --check`: PASS, con advertencias CRLF de Git sin errores.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.json`, `.md` modificados: PASS.

## Riesgos residuales controlados

- La tasa IESS se conserva en 9.45% personal y 11.15% patronal segun contexto vigente del repo; cualquier divergencia versionada se bloquea/loguea para revision profesional.
- No se ejecutaron migraciones nuevas; el consentimiento OWNER se registra en `audit_logs` existente.
- La limpieza de tests colocados fuera de `test/` no se ejecuta porque el runner actual los encuentra y son pruebas vivas.
- Revision legal/contable/LOPDP profesional sigue requerida antes de produccion.

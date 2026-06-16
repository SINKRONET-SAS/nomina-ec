# Reporte DCF26-10 - Mobile asistencia y autoservicio

## Resultado

DCF26-10 queda cerrada como fase runtime. La app movil deja de usar el `userId` del token como si fuera `empleadoId` y ahora consume contratos moviles que resuelven el empleado desde el usuario autenticado.

## Cambios funcionales

- Se agrego `mobileController` con:
  - `GET /api/mobile/me`
  - `GET /api/mobile/asistencia/resumen`
  - `POST /api/mobile/marcaciones`
  - `GET /api/mobile/nomina/:anio/:mes`
- La resolucion de empleado se hace por `tenant_id` y `email_personal` vinculado al email del usuario.
- `MarcacionScreen` ahora:
  - carga empleado y ultima marcacion desde backend movil.
  - registra asistencia sin enviar `empleadoId`.
  - muestra ubicacion y estados accionables.
- `MisMarcacionesScreen` ahora:
  - usa `/mobile/asistencia/resumen`.
  - muestra marcaciones y novedades recientes.
- Se agrego `AutoservicioScreen`:
  - perfil laboral del empleado.
  - rol del periodo actual cuando existe.
- `App.js` expone tabs: Asistencia, Historial y Autoservicio.

## Validaciones ejecutadas

- `node --check src/controllers/mobileController.js`: PASS.
- `node --check src/app.js`: PASS.
- `npm.cmd test -- mobileController.test.js --runInBand`: PASS, 1 suite, 2 tests.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- Parse JSX con `@babel/parser` sobre `app-movil/src`: PASS, `MOBILE_JSX_PARSE_OK`.
- `git diff --check`: PASS, solo avisos CRLF esperados en Windows.

## Riesgos residuales

- El vinculo usuario-empleado depende de que `email_personal` coincida con el email del usuario; una relacion formal `usuario_id` en empleados queda como mejora de modelo.
- Captura de foto queda fuera de esta fase porque el flujo previo no capturaba realmente la foto antes de enviar; se priorizo marcacion correcta y trazable.
- El autoservicio muestra rol del periodo actual, no descarga PDF desde la app.

# Reporte EAA26-06/08 - Asistencia, QA y release

## Readiness de asistencia

La marcacion movil queda fail-closed. El backend bloquea si falta:

- empleado activo y vinculado;
- unidad organizativa;
- zona de marcacion;
- jornada;
- horas mensuales de jornada;
- periodo operacional abierto;
- precision GPS aceptable.

Cada marcacion guarda periodo, fecha operacional en America/Guayaquil, zona, unidad, jornada, precision, origen y correlacion.

## Gates ejecutados

- `node --check` en servicios/controladores modificados: PASS.
- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS.
- `npx.cmd prisma generate`: PASS.
- `npm.cmd test -- employeeAppInviteService.test.js mobileController.test.js marcacionValidator.test.js --runInBand`: PASS, 3 suites y 8 tests.
- `npm.cmd test -- --runInBand`: PASS, 20 suites y 78 tests.
- Smoke SQL `listEmployeeAppInvitations` contra PostgreSQL local con tenant real: PASS.
- Smoke HTTP `POST /api/auth/public-register` contra backend local: PASS, devuelve `success: true`, `nextStep: email-verification` y token.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- `npm.cmd run doctor` en `app-movil`: PASS, 21/21 checks.

## Release Expo Go

Comando recomendado desde `app-movil`:

```powershell
npm.cmd run dev
```

Luego abrir el QR con Expo Go en el telefono. El telefono debe estar en la misma red que el backend local y la URL de API debe apuntar a la IP LAN del equipo.

## Riesgos residuales

- Definir canal real de envio de invitaciones: email, QR impreso, WhatsApp manual o canal interno.
- Probar deep link en build de tienda cuando exista presupuesto EAS/App Store/Play Store.
- Ejecutar smoke manual en telefono antes de considerar listo el flujo de campo.

## Bug corregido en registro publico

El backend local tenia `JWT_SECRET` con placeholder antiguo en `.env`, por eso el registro mostraba un error tecnico en la UI. Se corrigio el entorno local sin commitear secretos, se saneo el mensaje global para no filtrar nombres de variables sensibles y se movio la generacion del token antes del `COMMIT` en `publicRegister`, evitando crear empresas a medias si la firma del JWT falla.

# DCF26-10 - Mobile, asistencia y autoservicio

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P1

## Objetivo

Llevar la app movil de readiness formal a utilidad operacional clara para empleados y asistencia.

## Alcance

- Pantalla de cuenta, privacidad, terminos, soporte y eliminacion de cuenta.
- Marcacion con estados claros de GPS/foto/permisos.
- Mis marcaciones con filtros y errores humanizados.
- Politicas de almacenamiento local seguro.
- Cierre de sesion y limpieza segura.

## Reglas

- No cachear datos personales sensibles fuera de SecureStore o storage justificado.
- No activar analitica sin consentimiento.
- No prometer funcionalidad de nomina si no esta expuesta en app.

## Entregables

- Pantallas mobile reales.
- Ajustes de app store si aplica.
- Tests/checks posibles y capturas DEMO.
- Reporte `REPORTE_DCF26_10_MOBILE_ASISTENCIA_AUTOSERVICIO.md`.

## Gates

- `npm.cmd run check:stores`.
- `npx.cmd expo-doctor` cuando el entorno lo permita.
- Smoke manual documentado.

# Plan Haiky - HAIKY-EMPLEADOS-APP-ASISTENCIA-INVITACION-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-EMPLEADOS-APP-ASISTENCIA-INVITACION-2026 |
| Codigo | EAA26 |
| Estado | EAA26-01..08 ejecutadas localmente |
| Fase actual | EAA26-08 cerrada localmente |
| Alcance | proceso de invitacion, activacion y uso de app movil para empleados que registran asistencia |
| Referencia funcional | `C:\proyectos web\sinkroniq-mobile` |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/empleados-app-asistencia-invitacion-2026/MATRIZ_EAA26_REQUERIMIENTOS.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/EMPLEADOS-APP-ASISTENCIA-INVITACION-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

EAA26 convierte el patron de referidos e invitaciones de `sinkroniq-mobile` en un flujo laboral para Nomina-Ec: una empresa ya registrada invita a sus empleados existentes para que descarguen la app, activen su acceso y registren asistencia.

El flujo no es un sistema de referidos comercial. El empleado no crea una empresa, no se autoasigna a un tenant y no obtiene permisos administrativos. La activacion vincula una identidad movil con una ficha laboral existente, dentro del tenant correcto, con consentimiento LOPDP y con bloqueo claro si falta zona de marcacion, jornada o unidad organizativa.

## Referencia leida

Se revisaron estos patrones de `sinkroniq-mobile` como referencia funcional:

- `backend/src/services/growPartnerService.js`: generacion y normalizacion de codigos unicos, atribucion idempotente y estados.
- `backend/src/services/auth/staffAccountService.js`: invitacion con hash, expiracion, aceptacion, reenvio, revocacion y privacidad.
- `backend/src/services/auth/teamMembershipService.js`: estados `ACTIVE`, `PENDING_INVITE`, `DISABLED`, `REVOKED`.
- `mobile/src/screens/AcceptStaffInviteScreen.js`: pantalla de activacion con codigo, email, clave, ojo de contrasena y aceptacion de privacidad.
- `mobile/App.js`: deep link `staff/accept-invite`.
- `backend/prisma/migrations/20260308103000_staff_invites_compliance/migration.sql`: columnas de invitacion, hash, expiracion y auditoria.

## Principios de adaptacion

- La fuente de verdad es la ficha `Empleado` del tenant, no el telefono ni un registro publico.
- Toda invitacion debe tener hash del codigo, expiracion, estado, actor emisor y auditoria.
- La respuesta publica debe evitar enumeracion de empleados, cedulas, emails o empresas.
- La app solo habilita marcacion cuando el empleado esta activo, vinculado al tenant correcto y tiene unidad organizativa, zona de marcacion y jornada.
- Cada unidad organizativa que registre asistencia debe tener una zona de marcacion vigente o heredar una zona aprobada.
- La activacion registra version de privacidad, consentimiento para tratamiento de datos, geolocalizacion y reglas de asistencia.
- El OWNER/RRHH debe poder invitar, reenviar, revocar, ver estado y resolver bloqueos desde pantalla web.
- El empleado debe ver una experiencia corta: activar acceso, confirmar privacidad, ver estado laboral y marcar asistencia.

## Fuera de alcance

- No implementar runtime en EAA26-00.
- No copiar codigo de `sinkroniq-mobile` literalmente.
- No crear un segundo registro de empresa desde la app de empleados.
- No usar comisiones, referidos comerciales ni GrowPartner en Nomina-Ec.
- No habilitar marcaciones sin validacion de tenant, empleado, jornada, zona y periodo operacional.

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| EAA26-00 | P0 | completed_documental | Baseline, plan, matriz, prompts, contexto y AuditLock sin runtime. |
| EAA26-01 | P0 | completed_local | Auditoria comparativa: referidos/invitaciones de sinkroniq-mobile vs Nomina-Ec. |
| EAA26-02 | P0 | completed_local | Modelo de datos: invitaciones de empleado, codigos hash, expiracion, estados e indices. |
| EAA26-03 | P0 | completed_local | Backend: endpoints para crear, reenviar, revocar, aceptar y auditar invitaciones. |
| EAA26-04 | P0 | completed_local | Frontend OWNER/RRHH: panel de invitaciones, QR/link, estado y bloqueos operativos. |
| EAA26-05 | P0 | completed_local | App movil: activacion de empleado, ojo de clave, privacidad y enlace a ficha laboral. |
| EAA26-06 | P0 | completed_local | Asistencia: readiness de unidad, zona, jornada, periodo y marcacion fail-closed. |
| EAA26-07 | P1 | completed_by_contract | Notificaciones y deep links quedan contratados; entrega operativa inicial por link/codigo manual. |
| EAA26-08 | P0 | completed_local | QA, migraciones, rollback, evidencia y release gate Expo Go/build. |

## Contrato funcional esperado

1. RRHH selecciona empleados activos o importados y genera invitaciones.
2. El sistema valida que cada empleado tenga email o canal permitido, tenant, unidad organizativa, jornada y zona aplicable.
3. Se genera codigo de activacion de un solo uso, se almacena solo su hash y se define expiracion.
4. El empleado recibe link/QR/codigo, abre Expo Go o app publicada y activa su acceso.
5. La app exige email o cedula segun politica, codigo, contrasena, confirmacion y aceptacion LOPDP.
6. El backend vincula usuario movil con `empleado_id` y `tenant_id` dentro de transaccion.
7. La app muestra estado de asistencia y permite marcar entrada/salida si las reglas estan completas.
8. Cada marcacion queda con empleado, tenant, periodo operacional, zona, coordenadas, precision, origen y auditoria.

## Riesgos que el plan debe cerrar

- Empleado activado en empresa equivocada.
- Codigo reutilizado, vencido o filtrado.
- Enumeracion por mensajes publicos.
- Marcacion sin zona, jornada o unidad organizativa.
- GPS/foto/biometria sin consentimiento claro.
- Duplicidad de cuentas entre OWNER, RRHH y empleado.
- Falta de indices para consultas por tenant, empleado, estado y expiracion.
- App que abre y expulsa al usuario por errores de login o sesion.

## Gates minimos

- `npx prisma validate` y migracion local si hay cambio de esquema.
- Tests backend de invitacion: happy path, expirado, revocado, usado, tenant incorrecto y anti-enumeracion.
- Tests de asistencia: sin zona/jornada/unidad bloquea con mensaje visible.
- Smoke Expo Go en red local con backend activo.
- Revision de textos: sin promesas de cumplimiento absoluto y sin mensajes que resten confianza.
- AuditLock firmado por fase y commit `phase: EAA26-XX task: ...`.

## Ejecucion EAA26 2026-06-18

Runtime cerrado:

- Modelo PostgreSQL/Prisma para `employee_app_invites` y `employee_app_links`, con hashes, expiracion, estados, auditoria e indices parciales.
- Marcaciones extendidas con periodo operacional, fecha operacional Ecuador, zona, unidad, jornada, precision GPS, origen y correlacion de auditoria.
- Backend con endpoints para listar, crear, reenviar, revocar y aceptar invitaciones de empleados.
- App movil enfocada en activar empleado e ingresar a asistencia, no en registrar empresas u owners.
- Ojo de clave en activacion/login/recuperacion y consentimientos LOPDP/geolocalizacion obligatorios.
- Panel RRHH en lista de empleados con metricas, estado, bloqueos, link/codigo y acciones de invitacion.
- Asistencia fail-closed: no marca si falta unidad organizativa, zona de marcacion, jornada, horas mensuales o periodo abierto.

Gates ejecutados:

- `node --check` en servicios/controladores modificados: PASS.
- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS, migracion `20260618223000_eaa26_employee_app_invites`.
- `npx.cmd prisma generate`: PASS.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 20 suites y 78 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run check:stores` en `app-movil`: PASS.
- `npm.cmd run doctor` en `app-movil`: PASS, 21/21 checks.

Riesgos residuales controlados:

- Deep link de tienda y canal real de envio de invitaciones quedan para integracion externa; el flujo local ya entrega codigo/link para QR, correo o WhatsApp manual.
- Smoke manual en telefono con Expo Go debe repetirse en la red local de prueba con backend activo.

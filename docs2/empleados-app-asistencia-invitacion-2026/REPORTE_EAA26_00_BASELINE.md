# Reporte EAA26-00 - Baseline documental

## Resultado

EAA26-00 queda desplegada documentalmente. No se modifico runtime.

## Fuente revisada

Repositorio referencia: `C:\proyectos web\sinkroniq-mobile`.

Archivos inspeccionados:

- `backend/src/services/growPartnerService.js`.
- `backend/src/services/auth/teamMembershipService.js`.
- `backend/src/services/auth/staffAccountService.js` por busqueda focalizada.
- `mobile/src/screens/AcceptStaffInviteScreen.js`.
- `mobile/App.js`.
- `backend/prisma/migrations/20260308103000_staff_invites_compliance/migration.sql`.

## Hallazgo funcional

El flujo de referencia combina dos ideas utiles:

- Codigos normalizados y unicos para atribucion.
- Invitacion de staff con hash, expiracion, aceptacion, reenvio, privacidad y deep link.

Para Nomina-Ec la traduccion correcta no es "referidos", sino "activacion de empleado". El empleado debe existir antes en la nomina y la app solo debe vincular su acceso con esa ficha laboral.

## Decisiones de gobierno

- Codigo de plan: `EAA26`.
- Runtime pendiente de aprobacion por fase.
- Cada fase funcional debe dejar pantalla, endpoint, tests y evidencia.
- La marcacion no puede habilitarse si falta unidad organizativa, zona de marcacion o jornada.
- Cada unidad organizativa que opera asistencia debe tener zona de marcacion vigente o herencia explicita.

## Proximos pasos

Ejecutar `EAA26-01` solo con aprobacion explicita. Esa fase debe hacer auditoria comparativa contra codigo real de Nomina-Ec antes de proponer migraciones o UI.


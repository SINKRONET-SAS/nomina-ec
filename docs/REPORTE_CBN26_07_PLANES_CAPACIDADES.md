# REPORTE CBN26-07 - Planes, capacidades y gestion

Estado: completed_local
Fecha: 2026-06-14
Referencia: `SINKRONET-SAS/sinkroniq-mobile`

## Resultado

Se tomo como referencia el patron de `sinkroniq-mobile`: autoridad runtime backend, fail-closed cuando no hay plan, capacidades explicitas, mensajes de acceso y tests. Archivos revisados de referencia: `planCapabilities`, `useRuntimePlanFeatures`, `planAccessMessaging`, `AdminPlanesScreen` y pruebas de plan.

Implementacion en Nomina-Ec:

- `backend/src/services/planCapabilityService.js` resuelve capacidades del plan activo.
- `assertCapability` bloquea capacidades no incluidas con `PLAN_CAPABILITY_BLOCKED`.
- `reporteController.generarArchivoBanco` exige capacidad `bankFiles` antes de generar archivo bancario.
- `paymentController.tenantCapabilities` expone `/api/pagos/capabilities`.
- `frontend-web/src/pages/Planes.jsx` muestra capacidades del plan activo.
- Nueva pantalla protegida `frontend-web/src/pages/PlanesGestion.jsx` permite gestion de planes para `superadmin`.
- Menu/ruta `/dashboard/planes`.

## Validacion

- `backend/src/services/planCapabilityService.test.js` cubre capacidades y bloqueo.
- Backend tests completos pasaron.
- Frontend build paso.

## Riesgo residual

Solo se aplico enforcement a archivos bancarios y exposicion de capacidades base. Nuevas funcionalidades monetizadas deben agregarse a la matriz antes de exponerse.

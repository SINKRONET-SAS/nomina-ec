# Diagnostico integral Haiky 2026

Generado: 2026-07-07T18:49:38.073Z
Archivos runtime revisados: 246
Hash evidencia: 5d0145b1e7d6bf66944a569a3811fd18c95251a10d9eefc91feb0d757f883a56

## Capacidades confirmadas

- SQLite movilizacion local: confirmado (app-movil/package.json, app-movil/src/db/movilizacion.js)
- Aprobacion backend/PWA de informes de movilizacion: confirmado (backend/src/controllers/movilizacionController.js, frontend-web/src/pages/Operacion/MovilizacionAprobacion.jsx)
- Historial y autoservicio empleado: confirmado (frontend-web/src/pages/Empleados/HistorialEmpleado.jsx, app-movil/src/screens/AutoservicioScreen.js)
- Permisos con aprobacion operativa: confirmado (app-movil/src/screens/PermisosScreen.js, frontend-web/src/pages/Operacion/PermisosOperacion.jsx)
- Canal de pagos PayPhone: confirmado_con_gate (backend/src/services/payphoneGatewayService.js, frontend-web/src/pages/Planes.jsx)
- Email y auditoria de comunicaciones: confirmado (backend/src/services/communicationService.js, frontend-web/src/pages/Configuracion/Comunicaciones.jsx)

## Hallazgos automatizados

- funcionalidad_simulada_runtime: 11

- media funcionalidad_simulada_runtime: backend/src/config/s3.js:30 mock
- media funcionalidad_simulada_runtime: backend/src/controllers/paymentController.js:383 mock
- media funcionalidad_simulada_runtime: backend/src/controllers/paymentController.js:507 mock
- media funcionalidad_simulada_runtime: backend/src/controllers/paymentController.js:507 mock
- media funcionalidad_simulada_runtime: backend/src/controllers/paymentController.js:510 mock
- media funcionalidad_simulada_runtime: backend/src/controllers/paymentController.js:511 mock
- media funcionalidad_simulada_runtime: frontend-web/src/pages/PaymentResult.jsx:9 mock
- media funcionalidad_simulada_runtime: frontend-web/src/pages/PaymentResult.jsx:9 mock
- media funcionalidad_simulada_runtime: frontend-web/src/pages/PaymentResult.jsx:19 mock
- media funcionalidad_simulada_runtime: frontend-web/src/pages/PaymentResult.jsx:26 mock
- media funcionalidad_simulada_runtime: frontend-web/src/pages/PaymentResult.jsx:28 mock

# Diagnostico integral Haiky 2026

Generado: 2026-07-12T04:09:47.366Z
Archivos runtime revisados: 274
Hash evidencia: cedccb45e947cce33b81fc7c340389415dd5620afbace75f43c3317cf1921293

## Capacidades confirmadas

- SQLite movilizacion local: confirmado (app-movil/package.json, app-movil/src/db/movilizacion.js)
- Aprobacion backend/PWA de informes de movilizacion: confirmado (backend/src/controllers/movilizacionController.js, frontend-web/src/pages/Operacion/MovilizacionAprobacion.jsx)
- Historial y autoservicio empleado: confirmado (frontend-web/src/pages/Empleados/HistorialEmpleado.jsx, app-movil/src/screens/AutoservicioScreen.js)
- Permisos con aprobacion operativa: confirmado (app-movil/src/screens/PermisosScreen.js, frontend-web/src/pages/Operacion/PermisosOperacion.jsx)
- Canal de pagos PayPhone: confirmado_con_gate (backend/src/services/payphoneGatewayService.js, frontend-web/src/pages/Planes.jsx)
- Email y auditoria de comunicaciones: confirmado (backend/src/services/communicationService.js, frontend-web/src/pages/Configuracion/Comunicaciones.jsx)

## Alcance juridico

- Pais aplicable: Ecuador.
- Paises excluidos: Colombia.
- Nota: La auditoria legal, laboral, tributaria y de proteccion de datos personales aplica solo a Ecuador.

## Vigencia legal 2026

- Laboral Ecuador 2026: validado_operativamente. Control: No cambiar SBU 2026 sin fuente oficial vigente o aprobacion explicita del usuario.
- Facturacion electronica Ecuador: controlado_por_integracion. Control: Mantener emision fail-closed si faltan firma electronica, ambiente, autorizacion SRI o facturador externo configurado.
- Proteccion de datos personales Ecuador: controles_implementados. Control: Requiere revision juridica final de avisos, encargados, transferencias, retencion y contratos antes de salida comercial amplia.

## Senales controladas

- backend/src/config/s3.js:30 mock => controlado. Placeholder de almacenamiento para desarrollo; produccion inicial documentada usa STORAGE_DRIVER=local o proveedor real configurado.
- backend/src/controllers/paymentController.js:571 mock => controlado. Modo PayPhone de pruebas/dev; las activaciones productivas dependen de webhook/confirmacion firmada y pruebas gateway.
- backend/src/controllers/paymentController.js:699 mock => controlado. Modo PayPhone de pruebas/dev; las activaciones productivas dependen de webhook/confirmacion firmada y pruebas gateway.
- backend/src/controllers/paymentController.js:699 mock => controlado. Modo PayPhone de pruebas/dev; las activaciones productivas dependen de webhook/confirmacion firmada y pruebas gateway.
- backend/src/controllers/paymentController.js:702 mock => controlado. Modo PayPhone de pruebas/dev; las activaciones productivas dependen de webhook/confirmacion firmada y pruebas gateway.
- backend/src/controllers/paymentController.js:703 mock => controlado. Modo PayPhone de pruebas/dev; las activaciones productivas dependen de webhook/confirmacion firmada y pruebas gateway.
- frontend-web/src/pages/PaymentResult.jsx:9 mock => controlado. Pantalla muestra pago pendiente de confirmacion cuando llega una referencia de prueba; no concede plan ni marca cobro exitoso.
- frontend-web/src/pages/PaymentResult.jsx:9 mock => controlado. Pantalla muestra pago pendiente de confirmacion cuando llega una referencia de prueba; no concede plan ni marca cobro exitoso.
- frontend-web/src/pages/PaymentResult.jsx:19 mock => controlado. Pantalla muestra pago pendiente de confirmacion cuando llega una referencia de prueba; no concede plan ni marca cobro exitoso.
- frontend-web/src/pages/PaymentResult.jsx:26 mock => controlado. Pantalla muestra pago pendiente de confirmacion cuando llega una referencia de prueba; no concede plan ni marca cobro exitoso.

## Hallazgos automatizados


No se detectaron hallazgos automatizados en los patrones configurados.

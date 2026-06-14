# ONI26-01 - Diagnostico integral

## Resultado

Se completo el diagnostico previo a runtime para ONI26. La fase no modifica codigo de aplicacion; define riesgos, brechas y archivos permitidos para las fases siguientes.

## Inventario actual

- Sitio publico: `frontend-web/src/pages/Landing.jsx`, `Register.jsx`, `Login.jsx`, `ForgotPassword.jsx`, `LegalText.jsx`.
- PWA: `frontend-web/pwa.config.js`, `vite.config.js`, `public/*`, `scripts/smoke-pwa-lpa26.mjs`.
- Configuracion/parametrizacion: `frontend-web/src/pages/Configuracion/Parametrizacion.jsx`, `backend/src/controllers/configurationController.js`, `backend/src/services/configurationService.js`.
- Nomina: `backend/src/controllers/nominaController.js`, `backend/src/services/calculoNominaService.js`, pantallas `CerrarMes.jsx` y `RolesPagos.jsx`.
- Reportes: `backend/src/controllers/reporteController.js`, `sriRdepGenerator.js`, `iessSaeGenerator.js`, `sriAtsGenerator.js`, `bancoAebGenerator.js`, `DescargarReportes.jsx`.
- Bancos: `backend/src/config/bank-file-profiles.json`, `backend/src/services/bancoAebGenerator.js`.
- Asistencia: `marcacionController.js`, `novedadController.js`, `MarcacionScreen.js`, `MisMarcacionesScreen.js`, `ReporteAsistencia.jsx`, `NovedadesPendientes.jsx`.
- API actual: rutas REST bajo `backend/src/app.js`, sin contrato OpenAPI publico versionado.
- Mobile: `app-movil/app.json`, `eas.json`, `src/App.js`, pantallas y servicios.
- Seeds: `backend/scripts/seed-superadmin-owner.js`, migraciones Prisma.

## Brechas P0

- RDEP existe como generador, pero no hay evidencia de ficha tecnica/XSD vigente ni validacion formal contra XSD.
- No existe mapeo contable parametrizable por tenant para conceptos de nomina.
- API externa no tiene contrato versionado, scopes, API keys o rate limits especificos para integraciones.
- Carga masiva de empleados no esta implementada como flujo con prevalidacion, confirmacion y rollback.
- Los reportes no exponen aun exportacion Excel tabular general de nomina ni contrato PDF/Excel unificado.
- SUPERADMIN tiene planes, pero falta consola integral de owners, addons, contratos e incidencias.

## Brechas P1

- Sitio publico puede mejorar navegacion hacia demo, soporte y crear cuenta.
- Parametrizacion OWNER ya cubre bancos y usuarios/roles, pero falta matriz de permisos mas visible.
- Asistencia APP y manual existe, pero requiere mejor trazabilidad de permisos, errores y lote de novedades.
- Apertura de mes y lotes por estructura organizativa requieren contrato de estado mensual e idempotencia.
- Dashboard requiere headcount, altas/bajas, alertas y avance operativo mas ejecutivo.

## Brechas P2

- Persisten mojibake historicos en archivos no tocados por LPA26.
- Mensajes tecnicos pueden humanizarse con codigos de soporte.
- Faltan fixtures DEMO estandarizados para smoke E2E.

## Archivos runtime permitidos para ONI26-02..14

- `frontend-web/src/pages/Landing.jsx`
- `frontend-web/src/pages/Register.jsx`
- `frontend-web/src/pages/Login.jsx`
- `frontend-web/src/pages/ForgotPassword.jsx`
- `frontend-web/src/pages/Dashboard.jsx`
- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx`
- `frontend-web/src/pages/Nomina/*`
- `frontend-web/src/pages/Asistencia/*`
- `frontend-web/src/pages/Empleados/*`
- `frontend-web/src/pages/Auditoria.jsx`
- `frontend-web/src/services/*`
- `frontend-web/src/context/AuthContext.jsx`
- `backend/src/app.js`
- `backend/src/controllers/*`
- `backend/src/services/*`
- `backend/src/config/*`
- `backend/src/utils/*`
- `backend/scripts/*`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `app-movil/src/*`
- `app-movil/app.json`
- `app-movil/eas.json`

## Criterio de salida

- No se toca runtime en ONI26-01.
- Las fases siguientes deben evolucionar modulos existentes y evitar paralelos.
- Fichas tecnicas externas quedan como gate obligatorio antes de implementacion productiva.

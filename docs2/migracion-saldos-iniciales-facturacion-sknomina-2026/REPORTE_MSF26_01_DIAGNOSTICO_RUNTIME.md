# REPORTE MSF26-01 - Diagnostico runtime

Fecha: 2026-06-28  
Estado: completed_local

## Hallazgos runtime

- SKNOMINA backend expone rutas protegidas en `backend/src/app.js` bajo `/api` con `authenticateToken`, `requireRole` y `requireFreshUser`.
- Pagos comerciales se activan por Payphone en `backend/src/controllers/paymentController.js`; la activacion de plan ocurre al aprobar la transaccion.
- No existia modulo de saldos iniciales por lote, staging, dry-run, commit, reversa ni plantilla especifica para migracion de nuevos clientes.
- No existia modulo de facturacion fiscal delegado a SINKRONET FACTURADOR; SKNOMINA no guardaba solicitudes, referencias ni bloqueos fiscales.
- La PWA ya tiene menu operativo y rutas protegidas, por lo que los nuevos cierres deben exponerse en `Layout.jsx` y `App.jsx`.

## Facturador consultivo

- `C:\proyectos web\sinkroniq-mobile\app.json` identifica `Sinkronet Facturador`.
- El backend del facturador declara `Backend Facturacion Electronica Ecuador - Sinkronet`.
- El facturador expone `/api/facturas`, `/api/comprobantes`, `/api/secuenciales` y `/api/health`.
- Decision: integrar por API server-to-server, sin copiar codigo, secretos, certificados ni acceso directo a base.

## Resultado

Diagnostico completado. Se habilita runtime MSF26-02..08 con alcance controlado.

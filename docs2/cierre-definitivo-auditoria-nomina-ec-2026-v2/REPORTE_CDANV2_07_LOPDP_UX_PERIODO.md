# Reporte CDANV2-07 - LOPDP, UX y periodo

Fecha: 2026-06-27.

Resultado: completado.

## Cambios

- `communicationAuditService` agrega `purgeExpiredCommunicationEvents()` para eliminar eventos con `retention_until` vencido.
- `backend/scripts/purge-communication-events.js` expone purga operativa.
- `backend/package.json` agrega `privacy:purge-communications`.
- `app-movil/src/screens/AutoservicioScreen.js` formatea neto, ingresos y deducciones con `Intl.NumberFormat('es-EC', currency: 'USD')`.
- Se conserva el cambio previo de UX: `PDF transpuesto` ya no aparece como texto comercial visible; se muestra `PDF general`.

## Pruebas

- `npm.cmd test -- auth.test.js communicationAuditService.test.js nominaController.test.js --runInBand`: PASS.
- `node --check src/services/communicationAuditService.js`: PASS.
- `node --check scripts/purge-communication-events.js`: PASS.


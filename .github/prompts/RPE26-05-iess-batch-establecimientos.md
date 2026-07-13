# RPE26-05 - IESS batch TXT y establecimientos parametrizables

Objetivo: reemplazar la salida IESS tipo XML/SAE por batch ASCII TXT/DAT basado en la fuente IESS revisada y parametrizar el establecimiento IESS desde Datos de empresa.

Reglas:
- Aplicar `RULES.md`.
- No hardcodear codigo de establecimiento IESS.
- El establecimiento IESS debe vivir como submenu de Datos de empresa.
- La cantidad de establecimientos activos debe poder monetizarse por plan.
- Los planes deben mostrar precio base + IVA, contado anual, mensualidades y tasa nominal anual.
- El catalogo publico debe mostrar solo la ultima version vigente de cada plan raiz.
- Mantener compatibilidad de endpoints existentes sin prometer XML IESS.

Tareas:
- Actualizar manifiesto IESS a batch ASCII TXT/DAT con separador `;`.
- Hacer que el generador IESS use `configuration_catalogs.catalog_type = 'iess_establecimiento'`.
- Agregar submenu `Datos de empresa > IESS` en Parametrizacion.
- Agregar limite comercial `iess_establecimientos_max` en planes, backend y frontend admin.
- Homologar pricing con SINKRONIQ-MOBILE/BACKEND: `pricingInputMode`, `cuotasMensuales`, `tasaNominalAnual` y desglose IVA 15%.
- Mostrar en sitio publico y registro el precio mas IVA, total, contado anual y mensualidades.
- Asegurar que `listPublicPlans` rankee versiones y excluya planes `superseded`.
- Actualizar landing, permisos y contratos antirregresion para `Batch IESS TXT`.
- Actualizar pruebas de IESS y configuracion.

Cierre:
- `node --check backend/src/services/iessSaeGenerator.js`.
- `node --check backend/src/services/configurationService.js`.
- `node --check backend/src/controllers/paymentController.js`.
- `node --check scripts/verify-system-contracts.mjs`.
- `npm.cmd --workspace=backend test -- iessSaeGenerator.test.js app.routes.test.js configurationService.test.js paymentController.test.js --runInBand`.
- `npx prisma validate --schema backend/prisma/schema.prisma`.
- `npm.cmd run contracts`.
- `npm.cmd --workspace=frontend-web run build`.
- `git diff --check`.

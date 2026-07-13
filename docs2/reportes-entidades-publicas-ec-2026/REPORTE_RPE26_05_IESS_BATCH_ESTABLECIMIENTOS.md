# Reporte RPE26-05 - Batch IESS y establecimientos parametrizables

Fecha: 2026-07-12.

## Resultado

La revision adicional de IESS cambia la respuesta: IESS no se trata como XML SAE, sino como carga batch ASCII TXT/DAT. SKNOMINA genera el movimiento MSU en archivo `.txt` separado por punto y coma y exige un establecimiento IESS activo configurado en Datos de empresa > IESS.

## Evidencia

- Fuente IESS revisada: `https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320.jsp`.
- Documento informativo IESS revisado: `https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320b.html`.
- Texto fuente adjunto: archivos ASCII `.txt`/`.dat`, separador `;`, una linea por afiliado, formato MSU `RUC;0001;AAAA;MM;MSU;CEDULA;222.22`.
- Referencia local SINKRONIQ-MOBILE/BACKEND: establecimientos como recurso parametrizable y limite por plan.
- Referencia local SINKRONIQ-MOBILE/BACKEND: precios de planes con `pricingInputMode`, `cuotasMensuales`, `tasaNominalAnual` y desglose comercial de IVA 15%.

## Cambios aplicados

- `backend/src/services/iessSaeGenerator.js` genera batch IESS TXT/DAT MSU y no XML.
- `backend/src/services/iessSaeGenerator.js` resuelve establecimiento desde `configuration_catalogs.catalog_type = 'iess_establecimiento'`.
- `frontend-web/src/pages/Configuracion/parametrizacion/parametrizacionModel.jsx` agrega submenu Datos de empresa > IESS.
- `backend/src/services/configurationService.js` normaliza codigo IESS a cuatro digitos, valida limite del plan y conserva un solo principal.
- `backend/prisma/schema.prisma` y migracion agregan `iess_establecimientos_max`.
- `backend/src/controllers/paymentController.js`, `frontend-web/src/pages/PlanesGestion.jsx` y `frontend-web/src/config/publicPlanPresentation.js` exponen el limite comercial de establecimientos.
- `backend/src/controllers/paymentController.js` persiste en metadata el modo de precio, mensualidades y tasa nominal anual.
- `frontend-web/src/config/publicPlanPresentation.js`, `frontend-web/src/components/PublicPlansCatalog.jsx` y `frontend-web/src/pages/Register.jsx` muestran precio base + IVA, total, contado anual, mensualidades y tasa nominal.
- `frontend-web/src/pages/PlanesGestion.jsx` permite editar y verificar `pricingInputMode`, `cuotasMensuales` y `tasaNominalAnual`.
- `backend/src/controllers/paymentController.js` filtra el catalogo publico por la ultima version vigente de cada plan raiz, evitando publicar versiones antiguas.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx` comunica que el batch usa el establecimiento principal configurado.
- `scripts/verify-system-contracts.mjs` evita regresion a XML SAE y exige parametrizacion IESS.

## Gates esperados

- `node --check backend/src/services/iessSaeGenerator.js`.
- `node --check backend/src/services/configurationService.js`.
- `node --check backend/src/controllers/paymentController.js`.
- `node --check scripts/verify-system-contracts.mjs`.
- `npm.cmd --workspace=backend test -- iessSaeGenerator.test.js app.routes.test.js configurationService.test.js paymentController.test.js --runInBand`.
- `npx prisma validate --schema backend/prisma/schema.prisma`.
- `npm.cmd run contracts`.
- `npm.cmd --workspace=frontend-web run build`.
- `git diff --check`.

## Riesgo residual

- La carga IESS debe validarse con una empresa real en el portal IESS antes de declararla operacion productiva sin supervision.
- Solo se implementa MSU; otros movimientos batch (`ENT`, `SAL`, `INS`, `PFR`, etc.) quedan como alcance posterior por tipo de novedad.

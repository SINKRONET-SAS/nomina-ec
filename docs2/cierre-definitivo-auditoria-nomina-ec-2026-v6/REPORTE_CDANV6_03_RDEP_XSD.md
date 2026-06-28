# REPORTE CDANV6-03 - RDEP XSD Y GATE PRODUCTIVO

## Resultado

Estado: `completed_local`

RDEP queda gateado por XSD local, hash SHA-256 y manifiesto de fuente oficial SRI reconciliado.

## Cambios

- `backend/scripts/verify-rdep-xsd-source.js` valida hash y politica de reconciliacion.
- `backend/src/config/rdep/rdep-source-manifest.json` queda marcado como `checked_2026_06_28`.
- `backend/src/services/sriRdepGenerator.js` agrega check `official_source_reconciled` en `precheckRDEP()`.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx` muestra estado de fuente SRI y coincidencia de hash antes de generar XML.

## Fuente SRI

Pagina oficial revisada: `https://www.sri.gob.ec/formularios-e-instructivos1`.

El portal SRI mantenia publicado `Esquema RDEP 2023.xsd` con fecha de actualizacion 14 de diciembre de 2023 y programa RDEP fiscal 2026 publicado en 2026.

## Verificacion

- `npm.cmd --workspace=backend run rdep:verify-source`: PASS.
- `npm.cmd --workspace=backend test -- sriRdepGenerator.test.js liquidacionService.test.js --runInBand`: PASS, 2 suites, 13 tests.
- Backend test completo: PASS, 49 suites, 204 tests.

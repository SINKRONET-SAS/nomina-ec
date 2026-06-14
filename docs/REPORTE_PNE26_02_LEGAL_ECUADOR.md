# REPORTE PNE26-02 - Parametros legales Ecuador

Estado: completed_local_with_professional_block
Fecha: 2026-06-14

## Resultado

Se verifico que existen parametros legales versionados en base de datos y fallback centralizado en `backend/src/config/legal-ecuador.js`. Se corrigio el uso de tasas IESS fuera del servicio de parametros:

- `backend/src/services/iessSaeGenerator.js` ahora usa `getLegalParametersForTenant`.
- `backend/src/utils/utilidades.js` permite recibir parametros legales y usa fallback centralizado.
- `frontend-web/src/pages/Configuracion/Parametrizacion.jsx` ya no prellena el SBU en la UI.

## Bloqueo productivo

IESS y otros parametros sensibles siguen en `pendiente_validacion_oficial` hasta respaldo oficial y revision profesional legal/contable.

## Validacion legal/contable IESS 2026

El 2026-06-14 se revisaron fuentes oficiales IESS: portal institucional, pagina de normativa y consulta publica de resoluciones. La consulta oficial muestra fecha de actualizacion 9/6/2026 y filtros por resolucion, status, materia, palabra clave y fecha. No se localizo evidencia directa suficiente para aprobar las tasas 9.45% personal y 11.15% patronal como parametros oficiales 2026.

Resultado: `docs/VALIDACION_LEGAL_CONTABLE_IESS_2026.md` deja el gate IESS en `BLOCKED` para produccion. Los valores continuan permitidos solo como referencia tecnica local mientras `legalParameterService` mantiene el bloqueo `LEGAL_PARAMETERS_NOT_VALIDATED` en produccion o con `REQUIRE_VALIDATED_LEGAL_PARAMETERS=true`.

## Validaciones

- Prueba agregada: `backend/src/services/iessSaeGenerator.test.js`.
- No quedan tasas IESS hardcodeadas en UI, app movil o generador SAE.

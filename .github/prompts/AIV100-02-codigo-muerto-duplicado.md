# AIV100-02: Código Muerto y Duplicado

**Plan:** HAIKY-AUDITORIA-INTEGRAL-V100-SKNOMINA-2026
**Fase:** AIV100-02
**Estado:** pending

## Objetivo

Eliminar código muerto y extraer funciones duplicadas a módulo compartido.

## Hallazgos a corregir

| ID | Tipo | Archivo | Descripción |
|---|---|---|---|
| A-01 | Código muerto | backend/src/models/*.js | 4 archivos vacíos (0 bytes) |
| A-02 | Duplicado | payrollRolePdfService.js + payrollReportService.js | normalizeDetail, isOvertimeConcept, isRoleNoveltyLine |
| A-03 | Código muerto | app-movil/src/services/api.js:78 | mobilizationReports sin uso |
| A-04 | Código muerto | app-movil/src/services/geolocation.js | Archivo completo sin importar |

## Scripts

```bash
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A01-remove-dead-models.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A02-extract-payroll-utils.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A03-remove-dead-api-call.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A04-remove-dead-geolocation.js
```

## Verificación

- A-01: Confirmar que backend/src/models/ está vacío o eliminado
- A-02: Confirmar payrollCommonUtils.js creado; refactorizar imports manualmente
- A-03: Confirmar mobilizationReports eliminado de api.js
- A-04: Confirmar geolocation.js eliminado
- Ejecutar backend tests para confirmar no regresión

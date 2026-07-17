# RDE26-00 — Diagnóstico de baseline

## Hallazgos

- `payrollReportService.js` ya soporta XLSX, CSV, resumen, detalle, matrices, ledger de beneficios, reportes contables y consolidado anual.
- `DescargarReportes.jsx` ya expone varios formatos, filtros básicos y el consolidado anual, pero no permite elegir columnas ni modo contable.
- `buildSummaryPdf` y los roles usan identidad visual; Formulario 107 y otros documentos PDF requieren revisión de logo.
- `documentoLegalController.listar` solo filtra por empleado/tipo y no ofrece búsqueda ni paginación; Contratos consulta únicamente `tipo=contrato`.
- La carga de contratos firmados ya usa `firmado=true`, `documentKind` y `storageKey`, por lo que la descarga protegida existente es reutilizable.
- El catálogo de tipos Ecuador ya tiene endpoint protegido y se muestra en Contratos; Ayuda aún no lo consume.
- La eliminación de empleados es lógica y bloquea roles cerrados/pagados; actualmente no depura documentos vinculados.

## Decisiones de fase 00

- Reutilizar `tenant.configuracion.logoBase64`, `documentos_legales`, `s3Delete` y rutas protegidas existentes.
- No agregar fuente paralela para columnas, contratos o tipos legales.
- Mantener compatibilidad cuando el cliente no envía `columns`, `accountingMode`, `search`, `limit` u `offset`.

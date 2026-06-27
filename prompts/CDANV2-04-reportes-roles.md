# CDANV2-04 - Roles PDF y reportes de nomina

Objetivo: cerrar `SEC-V2-05` y `REP-V2-01`.

Requisitos:
- No disfrazar Excel como PDF.
- Reusar `payrollRolePdfService` y servicios de reportes existentes.
- Asegurar que `RolesPagos.jsx` descarga archivo real.
- Asegurar que reportes internos consumen endpoints reales.
- Errores visibles si falta almacenamiento o datos del periodo.
- Tests especificos de generacion y contrato frontend/backend.

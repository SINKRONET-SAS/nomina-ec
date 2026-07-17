# Prompt RDE26P2-01 — resolvedor de identidad empresarial

Implementa un servicio backend único para resolver la identidad empresarial documental.

- Prioriza el registro activo más reciente de `configuration_catalogs` con `catalog_type = 'empresa_operativa'` y `tenant_id` del contexto.
- Mapea camelCase y aliases legados a una proyección estable: representante, identificación, cargo, razón social, RUC, dirección, ciudad, provincia y logo.
- Usa `tenants.configuracion` y columnas legadas como fallback compatible.
- No ocultes errores de infraestructura: propaga `AppError` con `code`, `statusCode`, `correlationId` y `userId`.
- Agrega pruebas para catálogo prioritario, fallback y catálogo ausente.

Actualiza AuditLock solo después de ejecutar las validaciones de esta fase.

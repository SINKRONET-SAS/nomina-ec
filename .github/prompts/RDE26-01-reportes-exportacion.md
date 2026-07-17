# RDE26-01 — Reportes configurables

Con `RDE26-00` firmado, implementa un catálogo seguro de columnas para los reportes de nómina. Acepta filtros opcionales sin romper los existentes, registra las columnas seleccionadas y muestra en la PWA controles de selección y vista consolidada/detallada. La respuesta debe conservar `url`, `fileName`, `totalFilas`, `resumen` y `correlationId`. Prueba XLSX, CSV y consolidado anual. Actualiza AuditLock y detente si una validación falla.

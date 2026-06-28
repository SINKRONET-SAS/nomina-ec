# CDANV6-05 - Logs estructurados

Objetivo: cerrar HAL-4 removiendo logs de debug del navegador y normalizando logs backend aplicables.

Reglas:
- Requiere aprobacion explicita.
- No eliminar logs de scripts o banners justificados sin evaluar.
- Frontend no debe exponer datos de auth, planes, pagos o datos personales por consola.
- Backend debe usar logger estructurado compatible con el patron existente.
- Ejecutar pruebas/build pertinentes y `rg "console\\.log"` con excepciones documentadas.
- Crear `REPORTE_CDANV6_05_LOGS_ESTRUCTURADOS.md`.
- Actualizar AuditLock y commit `phase: CDANV6-05 task: logs-estructurados`.

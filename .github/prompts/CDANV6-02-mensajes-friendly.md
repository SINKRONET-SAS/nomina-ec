# CDANV6-02 - Mensajes friendly

Objetivo: cerrar HAL-1 en `backend/src/config/user-message-catalog.json`.

Reglas:
- Requiere aprobacion explicita.
- Mantener estructura del catalogo y compatibilidad de consumidores.
- Ningun mensaje activo puede quedar con `friendly` vacio.
- Textos visibles deben ser comerciales, claros y en espanol.
- Validar JSON y ejecutar pruebas backend pertinentes.
- Crear `REPORTE_CDANV6_02_MENSAJES_FRIENDLY.md`.
- Actualizar AuditLock y commit `phase: CDANV6-02 task: mensajes-friendly`.

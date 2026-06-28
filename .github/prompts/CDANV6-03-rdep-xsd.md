# CDANV6-03 - RDEP XSD

Objetivo: cerrar HAL-2 reconciliando XSD, catalogo y manifest RDEP contra fuente oficial vigente.

Reglas:
- Requiere aprobacion explicita.
- Si se requiere descargar fuente oficial SRI, pedir aprobacion de red.
- Calcular SHA-256 del XSD actual y del XSD nuevo.
- Actualizar manifest solo con fuente, version y hash verificables.
- Bloquear generacion productiva si la fuente oficial no se confirma.
- Ejecutar pruebas RDEP/backend pertinentes.
- Crear `REPORTE_CDANV6_03_RDEP_XSD.md`.
- Actualizar AuditLock y commit `phase: CDANV6-03 task: rdep-xsd`.

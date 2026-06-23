# CRS26-06 - Nomina, novedades, reportes y documentos

Actua bajo `RULES.md`.

Objetivo: hacer que procesos operativos consuman cargo real sin romper historicos.

Tareas:

- Validar AuditLock CRS26-05.
- Ajustar novedades/lotes con alcance por cargo para usar cargo real.
- Ajustar reportes de nomina para filtrar/agrupar por cargo y unidad.
- Ajustar contratos/documentos para usar nombre de cargo real con fallback historico.
- Revisar API externa y app/invitaciones para no exponer campos inconsistentes.
- Mantener compatibilidad con nominas y documentos anteriores a CRS26.

Cierre:

- Tests backend pasan.
- Exportaciones por persona/estructura incluyen cargo.
- Commit esperado: `phase: CRS26-06 task: cargos en nomina reportes documentos`.

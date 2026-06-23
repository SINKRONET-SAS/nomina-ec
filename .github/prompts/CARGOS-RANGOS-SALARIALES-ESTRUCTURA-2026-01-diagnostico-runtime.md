# CRS26-01 - Diagnostico runtime

Actua bajo `RULES.md`.

Objetivo: diagnosticar el runtime antes de crear tabla de cargos o migrar empleados.

Tareas:

- Validar AuditLock CRS26-00.
- Revisar Prisma, migraciones, controladores, servicios, seeds, demo, reportes, documentos e importacion.
- Identificar todos los usos de `cargo`, `position`, `scopeType=position` y filtros por estructura.
- Mapear impacto en nomina, novedades, reportes, contratos, invitaciones app y API externa.
- Proponer estrategia de migracion compatible y rollback.

Cierre:

- Reporte CRS26-01 con hallazgos, riesgos y decision de implementacion.
- No crear migraciones ni tocar datos en esta fase.
- Commit esperado: `phase: CRS26-01 task: diagnostico cargos runtime`.

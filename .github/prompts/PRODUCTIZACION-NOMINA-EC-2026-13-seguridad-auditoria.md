# PNE26-13 - Seguridad, auditoria, LOPDP y RLS

Ejecutar solo con aprobacion explicita.

Objetivo: convertir seguridad y auditoria en controles verificables, no promesas.

Tareas:
- Implementar o validar RLS en PostgreSQL.
- Probar aislamiento con usuario no superusuario.
- Centralizar AppError y correlationId.
- Auditar cambios sensibles.
- Documentar tratamiento LOPDP para empleados, GPS, fotos, cuentas y documentos.

Validaciones:
- Prueba RLS con usuario no superusuario.
- Tests de errores estructurados.
- Revision de `catch` vacios y returns silenciosos.
- Reporte `docs/REPORTE_PNE26_13_SEGURIDAD_AUDITORIA.md`.
- AuditLock firmado.

No hacer:
- No declarar cumplimiento LOPDP sin evidencia tecnica y documental.

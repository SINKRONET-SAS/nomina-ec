# PNE26-10 - Documentos legales y regulatorios

Ejecutar solo con aprobacion explicita.

Objetivo: generar, custodiar y auditar documentos laborales.

Tareas:
- Generar rol de pagos PDF.
- Generar contratos con clausula irrenunciable.
- Generar actas de finiquito y certificados laborales.
- Evaluar ATS/XML solo con alcance tributario validado.
- Guardar URLs, hashes, version y auditoria.

Validaciones:
- Tests de generacion o snapshots controlados.
- Validacion de storage sin secretos.
- Reporte `docs/REPORTE_PNE26_10_DOCUMENTOS.md`.
- AuditLock firmado.

No hacer:
- No exponer documentos de otro tenant.

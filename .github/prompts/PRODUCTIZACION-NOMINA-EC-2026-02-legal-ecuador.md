# PNE26-02 - Parametros legales Ecuador

Ejecutar solo con aprobacion explicita.

Objetivo: crear parametros legales versionados para Ecuador con fuente, vigencia, responsable y evidencia.

Tareas:
- Modelar salario basico, IESS, impuesto a la renta, decimos, vacaciones, jornada, horas extra, fondos de reserva y reglas de liquidacion.
- Registrar fuente normativa, fecha de carga, usuario responsable, version y estado.
- Impedir parametros activos superpuestos para el mismo periodo y rubro.
- Crear validadores y tests de lectura de parametros.
- Actualizar matriz legal en `docs`.

Validaciones:
- Validacion Prisma si se toca schema.
- Tests de parametros.
- Reporte `docs/REPORTE_PNE26_02_LEGAL_ECUADOR.md`.
- AuditLock firmado.

No hacer:
- No asumir valores legales sin evidencia oficial vigente.
- No hardcodear valores legales en UI, mobile o servicios aislados.

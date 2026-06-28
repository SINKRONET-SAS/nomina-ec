# MSF26-03 - Carga runtime de saldos iniciales

Objetivo: implementar dry-run, commit y reversa de saldos iniciales.

Instrucciones:

- Requiere aprobacion explicita.
- Aplicar `RULES.md`.
- Implementar servicio backend con validacion por fila, idempotencia, `correlationId`, auditoria y errores comerciales.
- Commit atomico por lote aprobado.
- Reversa controlada para lotes no consolidados.
- Agregar tests de carga exitosa, errores por fila, periodo cerrado, duplicidad y rollback.

Salida esperada:

- Endpoints y servicios protegidos por rol.
- Tests backend verdes.
- Reporte `REPORTE_MSF26_03_CARGA_SALDOS.md`.
- AuditLock firmado.

# MSF26-02 - Modelo de saldos iniciales

Objetivo: disenar e implementar el modelo seguro para saldos iniciales si la fase es aprobada.

Instrucciones:

- Requiere aprobacion explicita.
- Aplicar `RULES.md`.
- Crear migracion reversible para lote, staging, detalle, errores y estado.
- Definir plantilla CSV/XLSX versionada y catalogos de tipos de saldo.
- No alterar periodos cerrados ni recalcular roles historicos.
- Documentar rollback SQL o migracion compensatoria.

Salida esperada:

- Migracion validada.
- Plantilla versionada.
- Tests de validacion de modelo.
- Reporte `REPORTE_MSF26_02_MODELO_SALDOS.md`.
- AuditLock firmado.

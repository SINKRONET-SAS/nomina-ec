# PNE26-11 - Archivos bancarios

Ejecutar solo con aprobacion explicita.

Objetivo: generar archivos bancarios configurables y conciliables.

Tareas:
- Crear perfiles bancarios por empresa y banco.
- Generar CSV/TXT segun delimitador, encoding, header, trailer y mapa de campos.
- Rechazar cuentas placeholder o no validadas.
- Conciliar trailer contra suma de pagos.
- Registrar auditoria y hash de archivo.

Validaciones:
- Tests de formato y totales.
- Tests de rechazo de placeholders.
- Reporte `docs/REPORTE_PNE26_11_BANCOS.md`.
- AuditLock firmado.

No hacer:
- No generar archivo bancario de nomina no cerrada.

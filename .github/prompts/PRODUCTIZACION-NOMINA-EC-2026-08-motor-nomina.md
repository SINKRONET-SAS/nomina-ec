# PNE26-08 - Motor de nomina

Ejecutar solo con aprobacion explicita.

Objetivo: construir un motor de nomina ecuatoriana reproducible, idempotente y auditable.

Tareas:
- Calcular sueldo proporcional, horas extra, ingresos, IESS personal, impuesto a la renta, descuentos, decimos, vacaciones, fondos de reserva, neto y costo empleador.
- Usar parametros legales versionados.
- Guardar desglose completo de calculo.
- Implementar cierre inmutable, reapertura controlada y reversa documentada.
- Crear casos dorados con empleados de salarios distintos y novedades aprobadas.

Validaciones:
- Tests de calculo con expected values.
- Tests de idempotencia y cierre.
- Reporte `docs/REPORTE_PNE26_08_MOTOR_NOMINA.md`.
- AuditLock firmado.

No hacer:
- No cerrar periodos con errores de datos incompletos.
- No usar defaults silenciosos para valores legales.

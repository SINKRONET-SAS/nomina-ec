# HNBE26-04 - Motor de Calculo de Nomina

Objetivo: construir un motor reproducible, idempotente y auditable para calcular nomina ecuatoriana.

Tareas:
- Definir contrato de entrada: empleado, contrato, periodo, parametros, asistencia, novedades, beneficios y descuentos.
- Calcular ingresos, horas extra, IESS, impuesto a la renta, decimos, vacaciones, fondos de reserva, descuentos, neto y costo empleador.
- Guardar desglose completo de calculo para auditoria.
- Implementar cierre, reapertura controlada, reversa y recalculo con correlationId.
- Crear casos dorados con expected values y redondeo documentado.

No hacer:
- No cerrar periodos sin idempotency key o equivalente.
- No ocultar errores de datos incompletos con defaults silenciosos.
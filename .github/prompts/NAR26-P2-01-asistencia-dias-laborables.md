# NAR26-P2-01 - Dias laborables como novedades

Implementa el calculo de dias laborables con las reglas de jornada, fechas de ingreso/salida y periodo. La carga manual y masiva debe crear novedades informativas `dia_laborado`, idempotentes por empleado/fecha y con metadata de origen. No conviertas una falta de marcacion en falta aprobada. Expone en el reporte de asistencia los dias calculados, dias con novedad laboral y dias sin marcacion. Conserva tenant, RBAC, auditoria, `correlationId` y compatibilidad de payloads.

Gate: migracion reversible, tests del servicio y controlador, reporte y UI verificables.

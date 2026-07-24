# NAR26-01 — Novedades y reporte verificable

Usar la tabla `novedades_asistencia` existente. Exponer el listado operativo unificado de novedades manuales y masivas, con origen derivado de metadata, filtros por periodo/estado/tipo/empleado y campos de horas, monto y aprobador.

Implementar aprobar, editar, anular y eliminar con periodo abierto, tenant, RBAC, bloqueo si existe consumo en nómina, motivo de rechazo/anulación y auditoría. Agregar el estado `anulado` con migración reversible y preservar el contrato actual de aprobación/rechazo.

Crear reporte detallado JSON y CSV por periodo, con resumen de filas, totales y filtros. Exponerlo en una pantalla con búsqueda, estados de carga/error/vacío y descarga.

Agregar pruebas de controlador/servicio y de rutas para aislamiento tenant, estado anulado, consumo y CSV.

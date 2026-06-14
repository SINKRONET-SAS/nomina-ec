# PNE26-07 - Marcaciones y novedades

Ejecutar solo con aprobacion explicita.

Objetivo: implementar asistencia con geocerca, trazabilidad y workflow de aprobacion.

Tareas:
- Registrar marcaciones con tipo, timestamp, latitud, longitud, dispositivo, fuente, foto opcional y correlationId.
- Calcular perimetro con Haversine usando configuracion de empresa.
- Bloquear eliminacion de marcaciones.
- Crear novedades de asistencia con estado pendiente, aprobado y rechazado.
- Restringir aprobacion a OWNER y ADMIN_RRHH.

Validaciones:
- Tests Haversine y geocerca.
- Tests de ausencia de endpoint DELETE.
- Tests de aprobacion/rechazo.
- Reporte `docs/REPORTE_PNE26_07_ASISTENCIA.md`.
- AuditLock firmado.

No hacer:
- No aceptar marcaciones sin GPS salvo flujo documentado y aprobado.

# CDANV6-08 - LOPDP GPS y sueldo dia 31

Objetivo: cerrar HAL-7 y HAL-8.

Reglas:
- Requiere aprobacion explicita.
- En mobile, mostrar aviso LOPDP antes de solicitar permiso GPS.
- Si el empleado cancela o deniega permiso, no registrar marcacion y mostrar mensaje claro.
- En liquidacion, limitar dias pendientes a maximo 30 cuando se usa divisor mensual 30.
- Agregar test para salida el dia 31.
- Ejecutar pruebas backend pertinentes y `npm.cmd run check:mobile`.
- Crear `REPORTE_CDANV6_08_LOPDP_GPS_SUELDO_31.md`.
- Actualizar AuditLock y commit `phase: CDANV6-08 task: lopdp-gps-sueldo31`.

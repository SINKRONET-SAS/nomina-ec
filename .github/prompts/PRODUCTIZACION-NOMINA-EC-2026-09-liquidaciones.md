# PNE26-09 - Liquidaciones y finiquito

Ejecutar solo con aprobacion explicita.

Objetivo: calcular liquidaciones y actas de finiquito segun reglas laborales ecuatorianas verificadas.

Tareas:
- Calcular sueldo pendiente, decimos proporcionales, vacaciones, desahucio e indemnizacion cuando aplique.
- Soportar tipos de desvinculacion: renuncia, despido intempestivo, desahucio y visto bueno.
- Bloquear acta si existen equipos pendientes.
- Guardar desglose y evidencia.

Validaciones:
- Casos dorados por tipo de salida.
- Tests de bloqueo por equipos pendientes.
- Reporte `docs/REPORTE_PNE26_09_LIQUIDACIONES.md`.
- AuditLock firmado.

No hacer:
- No generar actas con monto inferior al minimo legal validado.

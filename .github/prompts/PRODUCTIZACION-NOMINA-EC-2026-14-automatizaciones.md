# PNE26-14 - Automatizaciones y cron jobs

Ejecutar solo con aprobacion explicita.

Objetivo: implementar automatizaciones sin fallos silenciosos.

Tareas:
- Revisar `node-cron`, Redis y workers existentes.
- Crear deteccion de marcaciones faltantes.
- Crear alertas de decimos y cierres.
- Registrar retry, error estructurado y correlationId.
- Definir comportamiento cuando Redis o DB no esten disponibles.

Validaciones:
- Tests de jobs.
- Logs de error estructurado.
- Reporte `docs/REPORTE_PNE26_14_AUTOMATIZACIONES.md`.
- AuditLock firmado.

No hacer:
- No ocultar errores de infraestructura.

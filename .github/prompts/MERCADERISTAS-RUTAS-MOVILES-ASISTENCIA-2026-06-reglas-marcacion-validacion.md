# MRM26-06 - Reglas de marcacion y validacion

Actua bajo `RULES.md`.

Objetivo: cerrar reglas fail-closed para evitar marcaciones inconsistentes en jornada y visitas.

Tareas:

- Bloquear inicio de visita si no hay jornada activa, salvo politica aprobada.
- Bloquear segunda visita abierta.
- Bloquear fin de jornada con visita abierta.
- Exigir periodo operacional vigente.
- Tratar fuera de geocerca como excepcion pendiente, no como exito silencioso.
- Validar QR/foto/comentario si la politica del sitio lo exige.
- Registrar errores por empleado de forma visible para app y PWA.

Cierre:

- Tests backend y smoke app/PWA.
- Reporte `REPORTE_MRM26_06_REGLAS_VALIDACION.md`.
- AuditLock firmado.
- Commit esperado: `phase: MRM26-06 task: reglas marcacion validacion`.

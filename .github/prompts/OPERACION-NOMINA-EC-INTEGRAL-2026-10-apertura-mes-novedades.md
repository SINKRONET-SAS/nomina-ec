# ONI26-10 - Apertura de mes y lote novedades

Actua bajo `RULES.md`.

Objetivo: implementar apertura mensual y carga/lote de novedades segun estructura organizativa.

Tareas:

- Validar AuditLock ONI26-09.
- Definir estado de periodo, apertura, bloqueo, reapertura y auditoria.
- Cargar novedades por lote, centro de costo, departamento, cargo o empleado.
- Validar duplicados e idempotencia.
- Documentar rollback.

Cierre:

- Pruebas con empresa DEMO.
- AuditLock firmado para ONI26-10.
- Commit esperado: `phase: ONI26-10 task: apertura mes novedades`.

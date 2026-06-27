# CDANV3-06 - Movilizacion backend

Objetivo: recibir, gobernar y resolver informes de movilizacion.

Implementar:
- Migracion `informe_movilizacion` con tenant, empleado, periodo, estado, total, detalle y aprobador.
- Servicio/controlador con endpoints:
  - `POST /api/movilizacion/informe`
  - `GET /api/movilizacion/mis-informes`
  - `GET /api/movilizacion/informes`
  - `PATCH /api/movilizacion/informes/:id`
- Reglas de aprobacion/rechazo, motivo obligatorio al rechazar y anticipo al aprobar.
- Auditoria y errores estructurados.

Validar:
- Tests unitarios y de controlador.
- Migracion y rollback documentados.

Cierre:
- Reporte `REPORTE_CDANV3_06_MOVILIZACION_BACKEND.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-06 task: movilizacion-backend`.

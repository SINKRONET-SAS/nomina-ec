# PNE26-15 - Planes, suscripciones y pagos

Ejecutar solo con aprobacion explicita.

Objetivo: hacer que el sistema pueda venderse y limitarse por capacidades reales.

Tareas:
- Integrar planes con limites de empleados, empresas, reportes, mobile y documentos.
- Evitar catalogos comerciales paralelos.
- Integrar PayPhone u otro canal aprobado con modo seguro.
- Auditar cambios de plan y pagos.

Validaciones:
- Tests de capacidades por plan.
- Tests de flujo de pago en sandbox si aplica.
- Reporte `docs/REPORTE_PNE26_15_COMERCIAL.md`.
- AuditLock firmado.

No hacer:
- No activar cobro real sin aprobacion explicita y entorno seguro.

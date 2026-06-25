# CRN26-04 - Motor y lineas de calculo

Actua bajo `RULES.md`.

Objetivo: hacer que el motor de nomina emita lineas de calculo normalizadas por concepto manteniendo compatibilidad historica.

Tareas:

- Mapear cada valor de `detalle_calculo` a concepto canonico.
- Persistir lineas por empleado, periodo, fuente, monto, centro de costo y parametro legal.
- Mantener `detalle_calculo` para compatibilidad.
- Evitar duplicacion de logica y recalculo historico.
- Cubrir beneficios aprobados como conceptos separados.

Cierre:

- Tests de calculo y snapshots por concepto.
- Sin cambios incompatibles en API publica.
- Reporte `REPORTE_CRN26_04_MOTOR_LINEAS_CALCULO.md`.
- AuditLock firmado.
- Commit esperado: `phase: CRN26-04 task: motor lineas calculo`.

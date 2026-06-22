# E2E26-06 - Novedades por periodo y lotes

Actua bajo `RULES.md`.

Objetivo: asegurar que novedades tengan periodo, lote y granularidad suficiente para casos reales.

Tareas:

- Validar AuditLock E2E26-05.
- Revisar modelo de novedades, indices, aprobaciones, lotes y motor de nomina.
- Evaluar unicidad empleado+fecha+tipo y definir granularidad horaria o consolidacion explicita.
- Bloquear calculo/cierre con novedades pendientes del periodo.
- Exponer lote, periodo y estado en PWA.
- Agregar pruebas para pendientes, aprobadas, rechazadas y duplicidad permitida/controlada.

Cierre:

- Novedades no generan ambiguedad ni bloqueo silencioso.
- Periodo y lote quedan visibles.
- AuditLock firmado para E2E26-06.
- Commit esperado: `phase: E2E26-06 task: novedades periodo lotes`.

# DPS26-04 tributario SRI aplicable

Objetivo: cerrar cumplimiento tributario aplicable a relacion de dependencia.

Requiere aprobacion explicita del usuario.

Tareas:
- Validar tabla IR 2026, base imponible, IESS deducible y rubros gravados/no gravados.
- Agregar fixtures para empleados bajo base, sobre tramos, ingresos/salidas, decimos, vacaciones y finiquito.
- Bloquear reportes SRI si falta ficha tecnica vigente.
- No prometer ATS como reporte de nomina sin confirmar alcance real.

Gates:
- Tests de motor tributario.
- Reporte de fuentes/manifest.
- `AuditLock.json` firmado.

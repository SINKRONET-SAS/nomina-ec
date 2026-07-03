# DPS26-03 motor de nomina

Objetivo: endurecer el motor de nomina para calculo trazable y cierre inmutable.

Requiere aprobacion explicita del usuario.

Tareas:
- Separar reglas puras de efectos de base de datos cuando aplique.
- Definir redondeo, snapshots, desglose por rubro y version de parametros.
- Validar sueldo proporcional, horas extra 50/100, IESS, IR, decimos, vacaciones y finiquito.
- Bloquear edicion directa de roles cerrados y documentar reversos controlados.

Gates:
- Tests unitarios y snapshots.
- `npm.cmd --workspace=backend test -- --runInBand`
- `git diff --check`
- Reporte de fase y `AuditLock.json` firmado.

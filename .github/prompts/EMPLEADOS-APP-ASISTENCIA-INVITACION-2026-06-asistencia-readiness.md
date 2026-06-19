# EAA26-06 - Readiness de asistencia

Objetivo: asegurar que la app solo marque asistencia cuando la configuracion laboral esta completa.

Requisitos:

- Cada empleado debe tener unidad organizativa, zona de marcacion y jornada vigentes.
- Cada unidad organizativa que use asistencia debe tener zona de marcacion o herencia explicita.
- Marcacion debe guardar periodo operacional y evitar bugs UTC en fechas Ecuador.
- Backend debe fallar cerrado con `ATTENDANCE_NOT_READY` si falta configuracion.
- Frontend/app debe explicar el bloqueo sin crear marcacion parcial.

Tests:

- Empleado sin zona.
- Unidad sin zona.
- Empleado sin jornada.
- Fecha operacional Ecuador.
- Marcacion duplicada o fuera de secuencia.

Commit esperado: `phase: EAA26-06 task: readiness asistencia app`.


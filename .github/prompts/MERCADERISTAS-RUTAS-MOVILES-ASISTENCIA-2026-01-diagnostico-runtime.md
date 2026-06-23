# MRM26-01 - Diagnostico runtime

Actua bajo `RULES.md`.

Objetivo: auditar como el sistema actual maneja asistencia movil, zonas de marcacion, jornada, periodo, empleados, app Expo, PWA y reportes antes de disenar cambios.

Tareas:

- Revisar schema Prisma, controladores y servicios de asistencia/marcaciones.
- Revisar app movil: login, activacion, permisos GPS, marcacion, offline y errores.
- Revisar PWA: parametrizacion de zonas, unidades, jornadas y reportes.
- Identificar si existe periodo operacional en novedades/marcaciones.
- Documentar brechas para mercaderistas: sitios dinamicos, multiples visitas, excepciones y supervisores.

Cierre:

- Reporte `REPORTE_MRM26_01_DIAGNOSTICO_RUNTIME.md`.
- Sin runtime salvo correcciones menores aprobadas en la fase.
- AuditLock firmado.
- Commit esperado: `phase: MRM26-01 task: diagnostico runtime rutas`.

# MRM26-05 - App movil ruta de hoy

Actua bajo `RULES.md`.

Objetivo: adaptar la app Expo para que el mercaderista vea y registre su ruta diaria con multiples visitas.

Tareas:

- Mostrar "Ruta de hoy" con tiendas asignadas y estado por parada.
- Botones "Llegue" y "Sali" por tienda.
- Boton "Agregar visita no programada" con motivo.
- Integrar permisos GPS y mensajes claros cuando falten permisos/readiness.
- Soportar cola offline si el repo ya tiene patron o documentar bloqueo si no existe.
- Mantener inicio/fin de jornada separado de llegada/salida de tiendas.

Cierre:

- Smoke Expo Go: dos visitas completadas y una no programada.
- Validacion de mensajes en espanol claro, sin codigos internos.
- Reporte `REPORTE_MRM26_05_APP_MOVIL.md`.
- AuditLock firmado.
- Commit esperado: `phase: MRM26-05 task: app movil ruta hoy`.

# MRM26-03 - Backend rutas y visitas

Actua bajo `RULES.md`.

Objetivo: implementar servicios y endpoints backend para administrar sitios, rutas, paradas, visitas y excepciones.

Tareas:

- CRUD tenant-aware de sitios con crear, editar, inactivar y eliminar solo si no hay consumos.
- Crear/asignar rutas diarias por empleado y periodo.
- Registrar llegada/salida por parada con geocerca y resultado del servidor.
- Registrar visitas no programadas con motivo y evidencia.
- Rechazar doble visita abierta y estados incoherentes.
- Auditar eventos relevantes sin guardar datos sensibles innecesarios.

Cierre:

- Tests backend para CRUD, geocerca, doble visita abierta, visita no programada y RLS/filtros.
- Reporte `REPORTE_MRM26_03_BACKEND_RUTAS_VISITAS.md`.
- AuditLock firmado.
- Commit esperado: `phase: MRM26-03 task: backend rutas visitas`.

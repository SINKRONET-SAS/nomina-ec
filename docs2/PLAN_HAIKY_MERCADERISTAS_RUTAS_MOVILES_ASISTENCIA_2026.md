# Plan Haiky - HAIKY-MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026 |
| Codigo | MRM26 |
| Estado | MRM26-00 desplegada documentalmente; runtime pendiente de aprobacion por fase |
| Fase actual | MRM26-00 baseline documental |
| Alcance | rutas moviles para mercaderistas: jornada diaria, multiples visitas por dia, sitios asignados/no programados, geocercas, evidencia y separacion asistencia vs ruta |
| Requerimiento fuente | "Mercaderistas visitan tiendas, pueden visitar varios sitios al dia y su marcacion requerida en la app es rotativa en los diferentes sitios a los que llega." |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/mercaderistas-rutas-moviles-asistencia-2026/MATRIZ_MRM26_REQUERIMIENTOS.md` |
| Contrato | `docs2/mercaderistas-rutas-moviles-asistencia-2026/CONTRATO_MRM26_RUTAS_VISITAS_MERCADERISTAS.md` |
| Runbook | `docs2/mercaderistas-rutas-moviles-asistencia-2026/RUNBOOK_MRM26_OPERACION_MOVIL.md` |
| Reporte baseline | `docs2/mercaderistas-rutas-moviles-asistencia-2026/REPORTE_MRM26_00_BASELINE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/MERCADERISTAS-RUTAS-MOVILES-ASISTENCIA-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

MRM26 define una correccion funcional para empleados tipo mercaderista, vendedores de campo, promotores o roles similares que no trabajan en una sola zona fija. El sistema debe permitir una jornada laboral diaria para nomina y, dentro de esa jornada, una ruta operativa con varias visitas a tiendas o clientes.

La asistencia responde: "trabajo hoy y en que horario". La ruta responde: "que sitios visito, cuando, donde y con que evidencia". Ambas comparten GPS y app movil, pero no deben mezclarse como si fueran el mismo evento.

## Principios de diseno funcional

- La jornada diaria conserva eventos de nomina: inicio de jornada, inicio/fin de almuerzo si aplica y fin de jornada.
- La ruta diaria contiene N paradas o visitas, con llegada y salida por sitio.
- Un mercaderista puede tener tiendas programadas y visitas no programadas con motivo.
- No se puede tener dos visitas abiertas al mismo tiempo.
- No se puede finalizar la jornada si existe una visita abierta.
- El orden de visitas puede cambiar solo si la politica de la empresa lo permite.
- Una visita fuera de geocerca no se descarta; queda como excepcion pendiente de revision.
- La app debe mostrar "Ruta de hoy" con estado claro de cada parada.
- La nomina debe usar la jornada; operaciones, supervisores y reportes comerciales deben usar las visitas.

## Modelo conceptual

| Entidad | Rol |
|---------|-----|
| `work_site` o `customer_site` | Tienda, cliente o punto de visita con direccion, GPS esperado, radio, estado, QR opcional y tenant. |
| `route_day` | Ruta asignada a un empleado para una fecha y periodo operacional. |
| `route_stop` | Parada programada dentro de la ruta: sitio, orden sugerido, ventana horaria, estado y reglas. |
| `visit_mark` | Marcacion de llegada/salida en una parada, con GPS, distancia, evidencia, dispositivo y resultado. |
| `unplanned_visit` | Visita no programada creada desde app, con motivo y aprobacion posterior si la politica lo exige. |
| `route_exception` | Evento fuera de regla: fuera de zona, visita omitida, visita abierta, GPS alterado, offline vencido o evidencia faltante. |

## Politicas MRM26

- Cada unidad organizativa mantiene zona base y readiness laboral, pero los mercaderistas pueden usar sitios dinamicos por ruta.
- La ruta diaria debe tener periodo operacional para trazabilidad de novedades, asistencia y reportes.
- Los sitios de visita pertenecen al tenant y pueden vincularse a una unidad organizativa, ciudad, cliente o canal comercial.
- Las visitas no programadas no deben autoaprobarse para indicadores oficiales si la empresa exige validacion.
- La evidencia sensible, como foto o ubicacion, debe aplicar minimizacion LOPDP, finalidad, retencion y visibilidad para el empleado.
- El modo offline debe guardar cola local solo lo necesario y reconciliar con el servidor con marca de tiempo del dispositivo y del servidor.
- Los reportes deben separar horas trabajadas, visitas completadas, visitas omitidas, excepciones GPS y kilometraje si se implementa.

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| MRM26-00 | P0 | completed_documental | Baseline documental, matriz, contrato, runbook, prompts, contexto y AuditLock sin tocar runtime. |
| MRM26-01 | P0 | pending_approval | Diagnostico runtime de asistencia movil, zonas de marcacion, jornadas, periodos, app Expo, backend y reportes. |
| MRM26-02 | P0 | pending_approval | Modelo de datos para sitios, rutas, paradas, visitas, excepciones, indices, RLS y retencion. |
| MRM26-03 | P0 | pending_approval | Backend de sitios, rutas y visitas: CRUD, asignacion, validaciones, geocerca, offline y auditoria. |
| MRM26-04 | P0 | pending_approval | PWA RRHH/supervisor: sitios, rutas diarias, asignacion masiva, monitoreo y aprobacion de excepciones. |
| MRM26-05 | P0 | pending_approval | App movil: ruta de hoy, llegada/salida por tienda, visita no programada, evidencia y ojo de clave si aplica. |
| MRM26-06 | P0 | pending_approval | Reglas fail-closed: no doble visita abierta, no fin de jornada con visita abierta, periodo requerido y geocerca. |
| MRM26-07 | P1 | pending_approval | Reportes, auditoria, LOPDP, retencion, trazabilidad por empleado, sitio, unidad y periodo. |
| MRM26-08 | P0 | pending_approval | QA, migraciones, rollback, seed demo, pruebas Expo Go, evidencia y release gate. |

## Entregables esperados

- Catalogo de sitios de visita por tenant con coordenadas, radio, estado, QR opcional y vinculacion organizativa.
- Rutas diarias por empleado con multiples paradas y periodo operacional.
- App movil con inicio/fin de jornada y botones "Llegue" / "Sali" por tienda.
- Alta de visita no programada con motivo, GPS, evidencia opcional y aprobacion.
- Validaciones que bloqueen estados incoherentes y expongan mensajes claros al empleado.
- PWA para RRHH/supervisor con crear/editar/eliminar si no hay consumos, inactivar si hay historico, asignar rutas y revisar excepciones.
- Reportes Excel/PDF/CSV por persona, unidad, ruta, sitio, ciudad, periodo y excepciones.
- Auditoria de eventos minimizada y compatible con LOPDP.
- Pruebas backend, build PWA y prueba Expo Go con un mercaderista demo.

## Gates globales

- `npx.cmd prisma validate` en `backend` si se modifica schema.
- `npx.cmd prisma migrate deploy` si se agregan migraciones.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` en `frontend-web`.
- Smoke Expo Go para iniciar jornada, llegar/salir de dos tiendas y finalizar jornada.
- Smoke PWA para crear sitio, ruta, revisar excepcion y exportar reporte.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.md`, `.json` modificados.
- AuditLock firmado por fase.

## Riesgos residuales

- La geolocalizacion y la evidencia fotografica requieren revision LOPDP y politica interna antes de produccion.
- El negocio debe definir si la ruta es obligatoria para pagar nomina o solo para control operativo.
- Se debe definir tolerancia de radio GPS por ciudad, tipo de tienda y calidad de senal.
- El modo offline requiere reglas anti-manipulacion y reconciliacion cuidadosa.

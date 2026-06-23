# Matriz MRM26 - Rutas moviles y visitas de mercaderistas

| ID | Prioridad | Requerimiento | Criterio de aceptacion | Fase |
|----|-----------|---------------|------------------------|------|
| MRM-R01 | P0 | Separar asistencia de ruta | La jornada diaria alimenta nomina y las visitas alimentan operacion/reportes; no se mezclan como un unico evento. | MRM26-02 |
| MRM-R02 | P0 | Permitir multiples visitas por dia | Un empleado puede completar dos o mas tiendas en una misma fecha con llegada y salida por cada sitio. | MRM26-03 |
| MRM-R03 | P0 | Ruta de hoy en app | La app muestra lista de tiendas asignadas, estado y acciones por parada. | MRM26-05 |
| MRM-R04 | P0 | Visita no programada | La app permite agregar visita no programada con motivo, GPS y evidencia segun politica. | MRM26-05 |
| MRM-R05 | P0 | No doble visita abierta | El backend rechaza iniciar una visita si otra visita esta abierta para el empleado. | MRM26-06 |
| MRM-R06 | P0 | No finalizar jornada con visita abierta | El backend y la app bloquean fin de jornada hasta cerrar la visita abierta. | MRM26-06 |
| MRM-R07 | P0 | Geocerca por sitio | Cada tienda tiene latitud, longitud y radio; fuera de radio queda como excepcion. | MRM26-03 |
| MRM-R08 | P0 | Periodo operacional | Ruta, visitas y excepciones guardan periodo para trazabilidad con novedades y cierre. | MRM26-02 |
| MRM-R09 | P0 | Sitios por tenant | Sitios y rutas aplican RLS/filtro obligatorio por tenant. | MRM26-02 |
| MRM-R10 | P1 | Orden flexible | Cambiar el orden de tiendas es posible solo si la politica del tenant lo permite. | MRM26-03 |
| MRM-R11 | P1 | Omision justificada | Omitir una visita exige motivo y queda visible para supervisor. | MRM26-04 |
| MRM-R12 | P1 | Evidencia configurable | Foto, comentario, QR y GPS son obligatorios/opcionales segun politica y tipo de sitio. | MRM26-02 |
| MRM-R13 | P1 | Modo offline controlado | La app cola eventos y el servidor registra hora de dispositivo, hora servidor y riesgo anti-tamper. | MRM26-05 |
| MRM-R14 | P1 | Supervision PWA | RRHH/supervisor puede crear sitios, asignar rutas, revisar estados y aprobar excepciones. | MRM26-04 |
| MRM-R15 | P1 | Reportes por estructura | Exportaciones agrupan por empleado, sitio, unidad organizativa, ciudad, periodo y estado. | MRM26-07 |
| MRM-R16 | P0 | LOPDP | Ubicacion/foto se minimizan, auditan y retienen segun finalidad laboral documentada. | MRM26-07 |
| MRM-R17 | P0 | Demo verificable | Seed demo permite probar un mercaderista con al menos tres visitas en un dia. | MRM26-08 |

## Bloqueos de negocio por definir

- Si una visita fuera de radio bloquea pago o solo crea excepcion operativa.
- Si la foto es obligatoria en todas las visitas o solo en tiendas criticas.
- Si el mercaderista puede crear sitios nuevos o solo visitas no programadas sobre sitios aprobados.
- Tolerancia maxima para eventos offline antes de requerir revision manual.

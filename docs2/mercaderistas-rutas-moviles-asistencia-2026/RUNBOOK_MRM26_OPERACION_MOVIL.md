# Runbook MRM26 - Operacion movil de mercaderistas

## Flujo esperado en app

1. El empleado ingresa a la app con acceso ya activado.
2. La app valida readiness: empresa, empleado, unidad, jornada, periodo, permiso GPS y politica de ruta.
3. El empleado inicia jornada.
4. La app muestra "Ruta de hoy".
5. En cada tienda, el empleado pulsa "Llegue".
6. Al salir de la tienda, pulsa "Sali".
7. Si visita un sitio no programado, usa "Agregar visita" y registra motivo.
8. Antes de finalizar jornada, la app exige que no exista visita abierta.
9. El empleado finaliza jornada.

## Flujo esperado en PWA

1. RRHH o supervisor registra sitios con GPS y radio.
2. Crea rutas diarias o importa rutas por empleado.
3. Revisa avance del dia: pendiente, en sitio, completada, omitida, fuera de zona.
4. Atiende excepciones con aprobacion, rechazo o solicitud de soporte.
5. Exporta reportes por persona, estructura, sitio, ciudad y periodo.

## Fallos controlados

| Caso | Comportamiento esperado |
|------|--------------------------|
| Sin periodo operacional | App bloquea marcacion y muestra mensaje claro. |
| Sin ruta asignada | App permite solo jornada si politica lo permite; ruta queda bloqueada. |
| GPS denegado | App bloquea visita si GPS es obligatorio. |
| Fuera de radio | Se registra excepcion, no se borra evidencia. |
| Dos visitas abiertas | Backend rechaza la segunda y app muestra visita pendiente de salida. |
| Fin de jornada con visita abierta | Backend rechaza y app solicita cerrar visita. |
| Offline | App cola evento con hora dispositivo y lo sincroniza con marca servidor. |

## Politica LOPDP

- La finalidad visible debe ser control laboral y operativo de rutas asignadas.
- No guardar ubicacion continua; solo eventos de marcacion y visita.
- No guardar fotos si la politica del tenant no las requiere.
- Retener evidencia solo por el periodo laboral/legal definido.
- Permitir al empleado ver sus eventos relevantes.
- Auditar accesos de supervisores a evidencia sensible.

## QA manual minimo

- Crear tres sitios demo.
- Asignar ruta de tres paradas a un mercaderista.
- Iniciar jornada, completar dos visitas y omitir una con motivo.
- Crear una visita no programada.
- Intentar abrir dos visitas al mismo tiempo y verificar bloqueo.
- Intentar cerrar jornada con visita abierta y verificar bloqueo.
- Exportar reporte del dia.

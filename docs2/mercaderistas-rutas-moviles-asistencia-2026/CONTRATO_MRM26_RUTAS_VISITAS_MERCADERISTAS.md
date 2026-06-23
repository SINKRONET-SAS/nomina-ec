# Contrato MRM26 - Rutas y visitas de mercaderistas

## Proposito

Este contrato define el comportamiento minimo que debe cumplir Nomina-Ec para empleados que visitan varios sitios en un dia. La implementacion debe evitar que el control de visitas comerciales altere indebidamente la asistencia usada para nomina.

## Estados principales

### Jornada diaria

| Estado | Descripcion |
|--------|-------------|
| `not_started` | El empleado aun no inicia jornada. |
| `working` | Jornada iniciada. Puede abrir visitas. |
| `lunch` | Almuerzo abierto si la jornada lo usa. |
| `closed` | Jornada terminada. No permite nuevas visitas salvo correccion auditable. |
| `exception_pending` | Existe incoherencia que requiere revision. |

### Parada de ruta

| Estado | Descripcion |
|--------|-------------|
| `pending` | Tienda asignada, sin llegada. |
| `in_site` | Llegada registrada, salida pendiente. |
| `completed` | Llegada y salida registradas. |
| `omitted` | Visita omitida con motivo. |
| `out_of_zone` | Marcacion fuera de radio permitido. |
| `exception_pending` | Requiere revision por supervisor. |

## Reglas obligatorias

- Una visita pertenece a un empleado, tenant, fecha, periodo y ruta diaria.
- Una visita programada pertenece a una parada; una no programada debe tener motivo.
- El servidor es quien decide si la visita queda valida, fuera de zona o pendiente.
- No se permiten dos visitas abiertas simultaneas por empleado.
- No se permite cerrar jornada con una visita abierta.
- No se permite abrir visita si la jornada no esta iniciada, salvo politica explicita.
- No se permite borrar sitios, rutas o visitas con consumos; se inactivan o corrigen con auditoria.
- Toda excepcion visible para el supervisor debe conservar evidencia minima: motivo, ubicacion reportada, hora dispositivo, hora servidor y usuario.
- La app debe mostrar mensajes operativos, no codigos tecnicos ni nombres de planes Haiky.

## Datos minimos por sitio

- Codigo unico por tenant.
- Nombre comercial de tienda/cliente.
- Direccion.
- Latitud y longitud.
- Radio permitido en metros.
- Estado: activo/inactivo.
- Unidad organizativa o canal si aplica.
- QR opcional.
- Reglas de evidencia si aplica.

## Datos minimos por visita

- Empleado.
- Tenant.
- Fecha y periodo.
- Ruta diaria.
- Sitio o motivo no programado.
- Tipo de marca: llegada/salida.
- Latitud/longitud capturada.
- Distancia calculada al sitio.
- Resultado: valida, fuera de zona, pendiente, rechazada.
- Evidencia configurada.
- Timestamps de dispositivo y servidor.

## Compatibilidad con nomina

La nomina no debe calcular ingresos por cantidad de tiendas visitadas salvo que exista una regla salarial aprobada en una fase futura. En MRM26 la jornada diaria sigue siendo la base de asistencia para rol de pago. Las visitas son evidencia operativa y pueden bloquear novedades o generar alertas, pero no sustituyen la jornada.

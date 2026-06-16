# DCF26-11 - Humanizacion UI/UX y estados

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P1

## Objetivo

Eliminar interacciones fragiles (`alert`, descargas opacas, mensajes tecnicos) y reemplazarlas por estados claros y accionables.

## Alcance

- Reportes, nomina, documentos, empleados, parametrizacion y app movil.
- Toasters o banners consistentes.
- Estados de carga, vacio, error y exito.
- CorrelationId visible cuando ayude a soporte.
- Mensajes del catalogo `user-message-catalog.json`.

## Reglas

- No usar texto visible para explicar shortcuts o implementacion.
- No ocultar fallos tecnicos; traducirlos a accion clara.
- No abrir ventanas sin indicar que se genero una descarga o enlace.

## Entregables

- UI sin `alert()` en frontend web.
- Flujos de descarga controlados.
- Reporte `REPORTE_DCF26_11_HUMANIZACION_UIUX.md`.

## Gates

- `rg "alert\\(" frontend-web/src` limpio o justificado.
- `npm.cmd run build`.
- Smoke visual de flujos tocados.

# RPE26-03 - Reportes eficientes para escala

Objetivo: evitar reportes ineficientes para nominas de 1000+ empleados.

Reglas:
- Priorizar reportes verticales: empleado-periodo, empleado-periodo-concepto y movimiento.
- Mantener matriz dinamica solo como uso puntual.
- No cambiar codigos de reporte soportados sin compatibilidad.

Tareas:
- Reordenar opciones para recomendar ledger y detalle por concepto.
- Advertir en PWA cuando se seleccione matriz dinamica.
- Agregar busqueda en Formulario 107 para evitar un selector gigante.
- Agregar contrato antiregresion contra `Generar XML SAE` y `XML SAE IESS`.

Cierre:
- `npm.cmd run contracts`.


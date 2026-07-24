# NAR26-03 — Carga masiva de cargos o puestos

Agregar plantilla CSV oficial y endpoint de carga por filas para `job_positions`. Aceptar código de unidad organizativa, código, nombre, descripción, sueldo mínimo/máximo, moneda, vigencia y estado.

Validar encabezado, límites salariales, fechas, unidad activa, duplicados dentro del archivo y duplicados existentes sin contaminar el tenant. Devolver resultado por fila y no ocultar errores parciales.

En Parametrización > Cargo o puesto mostrar descargar plantilla, seleccionar archivo, nombre del archivo, procesar y resumen. Conservar alta, edición y eliminación actuales.

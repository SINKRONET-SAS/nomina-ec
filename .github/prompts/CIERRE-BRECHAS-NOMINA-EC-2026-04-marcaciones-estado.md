# CBN26-04 - Estado separado en Marcaciones

Actua bajo `RULES.md`.

Objetivo: separar el estado del empleado usado para registrar marcacion del estado usado para filtrar historial.

Tareas:
- Mapear `Marcaciones.jsx` y componentes relacionados.
- Reemplazar `empleadoFiltro` compartido por estados independientes.
- Asegurar que registrar para empleado X no altere el historial visible salvo accion explicita del usuario.
- Crear `docs/REPORTE_CBN26_04_MARCACIONES_ESTADO.md`.

Validaciones:
- Build frontend.
- Prueba UI de registro y filtro.
- Sin regresion de permisos o geolocalizacion.

No hacer:
- No optimizar consultas de dashboard o marcaciones faltantes en esta fase.

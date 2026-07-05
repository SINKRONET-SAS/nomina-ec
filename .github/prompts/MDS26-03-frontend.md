# MDS26-03 - Frontend

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: exponer la eleccion de mensualizacion en el formulario de empleados y mostrar el impacto en el detalle de nomina.

Tareas:

- En `NuevoEmpleado.jsx`: agregar selects para modalidad decimo tercero y cuarto junto al existente de fondo de reserva.
- Opciones: `Acumular y pagar en fecha legal` (default) / `Mensualizar en rol`.
- En `CerrarMes.jsx` o detalle de nomina: mostrar montos mensualizados cuando aplique.
- En roles de pago (`RolesPago.jsx`): incluir linea de decimo tercero/cuarto mensualizado si corresponde.

Cierre:

- Frontend compila sin errores.
- Formulario empleado muestra las tres modalidades (fondo reserva + decimos).
- Detalle de nomina refleja montos mensualizados.

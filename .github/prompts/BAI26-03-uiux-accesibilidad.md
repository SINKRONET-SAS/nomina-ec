# BAI26-03 - UI/UX y accesibilidad

- **Plan**: `HAIKY-BENEFICIOS-ANTICIPOS-INTEGRAL-2026`
- **Codigo fase**: `BAI26-03`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `BAI26-02` firmado

## Objetivo

Mejorar la experiencia de usuario, accesibilidad y pulido visual del modulo de Anticipos y prestamos.

## Tareas

### BAI26-03-T1: Paginacion en Roles generados

- Agregar `TablePagination` a la seccion de roles generados (`advanceRoles.map`).
- Agregar estado: `rolePage`, `rolePageSize`, `totalRolePages`.
- Paginar la lista de `<article>` de roles.

### BAI26-03-T2: aria-label en checkboxes y botones

- Checkboxes de seleccion de empleados: `aria-label={`Incluir a ${employee.nombres} ${employee.apellidos}`}`
- Botones icon-only de accion (Aprobar, Anular, Editar, Eliminar): agregar `aria-label` ademas de `title`.
- Botones de descarga y aprobacion en roles: agregar `aria-label`.

### BAI26-03-T3: Modal de confirmacion estilizado

- Reemplazar `window.confirm()` por componente modal consistente con el sistema de diseno.
- Aplicar en acciones: Aprobar, Anular, Eliminar beneficio.
- Modal con titulo, mensaje descriptivo, botones Confirmar/Cancelar.

### BAI26-03-T4: Debounce en busqueda de empleados

- Agregar debounce de 300ms al input de busqueda de empleados para rol de anticipos.
- Evitar reset de pagina en cada keystroke.

### BAI26-03-T5: Reset filtros y formato fecha

- Agregar boton "Limpiar filtros" junto a los filtros de Roles generados.
- Formatear `fechaCorte` como DD/MM/YYYY en la vista de roles.

### BAI26-03-T6: Tooltip Descontar vs Bonificar

- Agregar texto explicativo o tooltip en la seccion de acciones de linea:
  - "Descontar: se crea un beneficio que se deduce del sueldo al cerrar mes"
  - "Bonificar: se registra como novedad de ingreso adicional"

### BAI26-03-T7: maxLength en textarea CSV

- Agregar `maxLength` al textarea de CSV que coincida con limite backend.
- Agregar contador de caracteres visible.

## Archivos a modificar

- `frontend-web/src/pages/Nomina/Beneficios.jsx`

## Validacion de cierre

- [ ] Roles generados paginados con TablePagination
- [ ] Todos los controles interactivos tienen aria-label
- [ ] Modal de confirmacion estilizado funcional
- [ ] Busqueda de empleados con debounce 300ms
- [ ] Boton reset filtros funcional
- [ ] fechaCorte formateada DD/MM/YYYY
- [ ] Tooltip Descontar/Bonificar visible
- [ ] Build web PASS (JSX compila)

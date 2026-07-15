# HRD26-02 PWA disponibilidad

Base: `RULES.md` y fase HRD26-01 firmada.

Objetivo: exponer la matriz y filtros en la PWA.

Requisitos:

- Agregar opcion `Matriz de novedades del rol`.
- Cambiar filtro manual de empleado por alcance `Global` / `Individual`.
- Para alcance individual, permitir busqueda y select de empleado.
- Distinguir acciones `Exportar mes` y `Acumulado anual`.
- Mantener Formulario 107 y reportes institucionales sin regresion.

Validacion minima:

- `node scripts/verify-system-contracts.mjs`
- `npm --workspace=frontend-web run build`

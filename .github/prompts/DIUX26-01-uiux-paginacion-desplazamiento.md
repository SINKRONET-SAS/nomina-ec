# PROMPT FASE DIUX26-01: REDISEÑO UI/UX, PAGINACIÓN ESTANDARIZADA Y DESPLAZAMIENTO RESPONSIVO

## Contexto y Alcance
Fase enfocada en resolver la saturación visual y la sobrecarga del árbol DOM en `frontend-web`.
Crear e integrar el componente reusable `<TablePagination />` en las pantallas de datos densos (`ListaEmpleados`, `RolesPagos`, `ReporteAsistencia`, `ReporteNovedades`, `NovedadesPendientes`, `ContratosGenerados`, `ActasFiniquito`, `Auditoria`, `UsuariosRoles`).

## Criterios de Aceptación
1. Componente `TablePagination.jsx` funcional con controles de número de página, total de páginas, botones Anterior/Siguiente y desplegable de `pageSize` (10, 25, 50, 100).
2. Integración en `ListaEmpleados.jsx` y `RolesPagos.jsx` con navegación fluida sin romper filtros de búsqueda por nombre o cédula.
3. Integración en reportes y bitácora de auditoría.
4. Paridad de diseño Tailwind CSS coherente con la paleta de SKNOMINA (Slate/Teal).
5. Sin regresiones en el parseo estático de JSX ni en los contratos del sistema (`npm run contracts`).

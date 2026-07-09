# URR26 02 - Frontend: matriz de permisos y sidebar dinamico

Usar `.github/CODEX_CONTEXT.md` y `RULES.md`.

Objetivo: reemplazar el dropdown de "Acceso empleado" por matriz visual y hacer el sidebar dinamico.

Tareas:

1. Reemplazar campo `employee_access` en `parametrizacionModel.jsx`:
   - Eliminar el campo select con 3 opciones.
   - Agregar campo tipo `modulePermissionMatrix` que renderice la matriz de checkboxes.
   - Guardar en `payload.modulePermissions` como objeto `{ [moduleCode]: boolean }`.

2. Crear componente `ModulePermissionMatrix.jsx` en `frontend-web/src/components/`:
   - Tabla con filas = modulos (nombre, descripcion), columnas = checkbox habilitado/deshabilitado.
   - Props: `value` (objeto permisos), `onChange`, `role` (para mostrar defaults), `readOnly`.
   - Estilo coherente con el tema teal del sistema.

3. Actualizar `Parametrizacion.jsx` para renderizar el nuevo tipo de campo `modulePermissionMatrix`.

4. Actualizar sidebar en `Layout.jsx`:
   - Agregar `modulePermissions` al `session-context` query.
   - Filtrar `menuItems` segun permisos efectivos del usuario, no solo por `roles`.
   - Funcion `hasModuleAccess(moduleCode)` que evalua permisos.

5. Agregar guard de ruta en el router:
   - Redirigir a `/dashboard` si el usuario intenta navegar a un modulo sin acceso.

Gate: `npm.cmd --workspace=frontend-web run build` exitoso, sidebar filtra modulos.

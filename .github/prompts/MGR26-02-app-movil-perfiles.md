# MGR26-02 - App movil por perfiles

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: exponer en Expo una consola operativa que oculte acciones no autorizadas por perfil.

Tareas:

- Crear `app-movil/src/screens/OperacionMovilScreen.js`.
- Agregar cliente API para `/mobile/admin/...`.
- Enrutar `owner/admin_rrhh/supervisor` a la consola movil.
- Mantener `superadmin` fuera de operacion de tenant movil y guiarlo a PWA.
- Usar `allowedActions` para no renderizar secciones que el perfil no puede ejecutar.

Cierre:

- `supervisor` no ve creacion de zonas ni sitios.
- `owner/admin_rrhh` ven zonas, sitios y asignacion.
- No usar botones deshabilitados como sustituto de control de visibilidad por perfil.

# ANECV6R26-02 - SUPERADMIN SEED RENDER

Objetivo:

- convertir `seed-superadmin` en bootstrap idempotente de despliegue;
- ejecutar seed en `render.yaml` solo para la API;
- exigir `SUPERADMIN_*` cuando no exista uno activo.

No permitido:

- hardcodear credenciales;
- crear mas de un `SUPERADMIN` por deploy;
- depender de argumentos CLI manuales dentro del build.

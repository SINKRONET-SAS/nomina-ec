# CDANV2-03 - Superadmin y seed inicial seguro

Objetivo: cerrar `SEC-V2-04` y `SEED-V2-01`.

Requisitos:
- Verificar primero si `superadminController` ya existe y si `PlanesGestion.jsx` consume rutas reales.
- Crear solo lo faltante; no duplicar controladores.
- Seed idempotente por variables `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`.
- No hardcodear credenciales ni datos reales.
- Pantalla superadmin funcional o bloqueo visible.
- Pruebas de rutas, permisos y seed dry-run si aplica.

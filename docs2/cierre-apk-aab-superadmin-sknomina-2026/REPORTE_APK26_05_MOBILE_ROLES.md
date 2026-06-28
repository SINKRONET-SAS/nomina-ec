# REPORTE APK26-05 - Mobile roles

## Cambios

- `app-movil/src/App.js` consume `mobileAPI.me()` despues de cargar token.
- Guarda usuario autenticado en `SecureStore` para fallback de roles administrativos.
- Empleado mantiene tabs operativos: marcar, ruta, movilizacion, permisos, historial y autoservicio.
- Owner, admin RRHH y superadmin ven una pantalla administrativa movil, no el flujo de marcacion de empleado.
- Si el perfil movil no carga para un empleado, se muestra mensaje comercial y accion para cerrar sesion.

## Validacion

- `npm.cmd run check:mobile`: PASS.
- `npx.cmd expo-doctor`: PASS.


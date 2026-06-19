# Reporte DIC26-02/06 - Ejecucion runtime

## Frontend web

- `Landing.jsx`: bloque de oferta comercial con prueba, PYME y corporativo.
- `Login.jsx`: boton de mostrar/ocultar contrasena.
- `Register.jsx`: boton de mostrar/ocultar contrasena.
- `ForgotPassword.jsx`: boton de mostrar/ocultar nueva contrasena.

## App movil

- `App.js`: shell autenticado con tabs simples `Marcar`, `Historial` y `Perfil`.
- `MisMarcacionesScreen.js`: fechas con timezone `America/Guayaquil`.
- `AutoservicioScreen.js`: periodo actual calculado con timezone `America/Guayaquil`.
- `app.json`: retirado permiso de camara.
- `src/services/camera.js`: eliminado porque no existia flujo de captura real.
- `package.json` y `package-lock.json`: retiradas dependencias de camara y navegacion no usadas.

## Encoding

- Eliminados BOM en archivos runtime heredados.
- Reescritos reportes historicos para no contener secuencias literales de mojibake que generen falsos positivos.
- Gate global BOM/mojibake: PASS.

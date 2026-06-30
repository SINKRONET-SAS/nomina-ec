# CDANV6S-03 Mobile Permisos y Movilizacion

Resultado: cerrado previo.

- `app-movil/package.json` incluye `expo-sqlite`.
- `app-movil/src/db/movilizacion.js` inicializa la base local.
- `app-movil/src/screens/GastosMovilizacionScreen.js` existe.
- `app-movil/src/screens/PermisosScreen.js` existe.
- `app-movil/src/App.js` integra tabs para `movilizacion` y `permisos`.
- `backend/src/app.js` registra `POST /api/mobile/permisos`.

No se renombra "Mi Nomina" a SKNOMINA; esa etiqueta es funcional.

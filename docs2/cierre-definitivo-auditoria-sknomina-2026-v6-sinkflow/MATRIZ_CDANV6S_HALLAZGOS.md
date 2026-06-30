# Matriz CDANV6S

| ID | Severidad V6 | Resultado | Accion |
|----|--------------|-----------|--------|
| SA-01 | Critico | Cerrado previo | Mantener `seed:admins` en `render.yaml`; gate de revision. |
| REP-01 | Critico | Cerrado previo | Mantener ruta antes de rutas genericas y pruebas de orden. |
| EMAIL-01 | Critico | Cerrado por equivalente | Conservar `sendRolPagoDisponible`; no duplicar con `sendRolPagoEmail`. |
| MOV-01 | Critico | Cerrado previo | Conservar dependencia `expo-sqlite` y validacion mobile. |
| MOV-02 | Critico | Cerrado previo | Conservar `GastosMovilizacionScreen` en tabs del empleado. |
| MOV-03 | Critico | Cerrado por arquitectura actual | Mantener schema/servicios actuales de informes de movilizacion; no forzar nombres externos. |
| PAY-01 | Critico | Cerrado previo | Mantener variables PayPhone reales en Render y bloquear mock productivo. |
| AUT-02 | Critico | Cerrado previo | Mantener `PermisosScreen` y endpoint mobile de permisos. |

## Evidencia leida

- `backend/src/app.js`
- `backend/src/controllers/nominaController.js`
- `backend/src/services/payrollRolePdfService.js`
- `backend/src/services/communicationService.js`
- `backend/src/controllers/mobileController.js`
- `app-movil/package.json`
- `app-movil/src/App.js`
- `app-movil/src/db/movilizacion.js`
- `app-movil/src/screens/GastosMovilizacionScreen.js`
- `app-movil/src/screens/PermisosScreen.js`
- `render.yaml`

## Criterio

Un hallazgo V6 queda cerrado cuando existe contrato runtime equivalente, ruta registrada, pantalla conectada o variable productiva declarada en el repo real. Los nombres sugeridos por scripts externos no son obligatorios si el consumidor activo usa otro contrato probado.

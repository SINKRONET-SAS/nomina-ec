# Reporte EAA26-04/05 - Web RRHH y app movil

## Frontend OWNER/RRHH

`frontend-web/src/pages/Empleados/ListaEmpleados.jsx` incorpora un panel de activacion de app de asistencia:

- Metricas de empleados, listos, activos, pendientes y bloqueados.
- Acciones de invitar, reenviar y revocar.
- Codigo/link de activacion copiable.
- Bloqueos visibles cuando falta email, unidad organizativa, zona o jornada.

## App movil Expo

`app-movil/src/screens/LoginScreen.js` queda enfocada en empleados:

- Modo inicial `activar`.
- Campos email, cedula opcional, codigo de invitacion, clave y confirmacion.
- Ojo de clave para verificar lo digitado.
- Consentimiento de privacidad, tratamiento de datos y geolocalizacion.
- Login y recuperacion se mantienen para empleados ya activados.

## Asistencia movil

`app-movil/src/screens/MarcacionScreen.js` muestra unidad, zona, jornada, precision GPS y bloqueos. La pantalla no permite marcar si el backend reporta `readiness.ready = false`.

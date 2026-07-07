# HAIKY-AUDITORIA-INTEGRAL-2026-02 - Movilizacion SQLite y cierre

Objetivo: asegurar flujo app movil SQLite -> backend -> aprobacion PWA -> anticipo.

Reglas: no cerrar periodo local si el informe no fue enviado al backend; no duplicar estados fuera de la DB local/central.

Tareas:
- Revisar `app-movil/src/db/movilizacion.js`.
- Revisar `app-movil/src/screens/GastosMovilizacionScreen.js`.
- Revisar `backend/src/controllers/movilizacionController.js`.
- Revisar `frontend-web/src/pages/Operacion/MovilizacionAprobacion.jsx`.
- Verificar que origen/destino sugieren domicilio -> primera parada y parada completada -> siguiente parada.

Cierre:
- Envio backend previo a cierre local.
- Backend crea novedad `anticipo_movilizacion` al aprobar si aplica.
- PWA muestra informes pendientes, aprobados y rechazados.


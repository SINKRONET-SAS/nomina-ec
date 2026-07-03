# DPS26-07 PWA procesos criticos

Objetivo: cerrar flujos PWA de operacion mensual.

Requiere aprobacion explicita del usuario.

Tareas:
- Validar alta empresa, alta empleado, asistencia, novedades, calculo, revision, cierre y reportes.
- Agregar estados loading, empty, error, retry y blocked/legal validation.
- Asegurar que superadmin/fundador y owners vean acciones segun rol y tenant.
- Validar que el fundador pueda operar su tenant y acceder a funciones superadmin sin entrar al codigo.
- Evitar cache/offline de datos sensibles no aptos.

Gates:
- Build frontend.
- Smoke local de rutas criticas.
- Reporte de fase y `AuditLock.json` firmado.

# HNBE26-07 - Planes, Perfiles y Permisos

Objetivo: integrar nomina/RRHH con gestion de planes y perfiles existentes sin crear catalogos paralelos.

Tareas:
- Definir capabilities de plan: max empleados, asistencia mobile, reportes avanzados, documentos laborales, archivos bancarios y API laboral.
- Mapear permisos RRHH en `roles.js` o mecanismo equivalente: ver empleados, gestionar nomina, aprobar novedades, ver reportes, administrar beneficios y documentos.
- Homologar PWA/mobile/admin para que las mismas capacidades se vean, editen, persistan y apliquen en runtime.
- Definir perfiles: OWNER, ADMIN_RRHH, CONTADOR/RRHH delegado, EMPLEADO autoservicio y SUPERADMIN.
- Probar downgrades cuando el cliente excede max empleados o capacidades.

No hacer:
- No duplicar `publicPlanCatalog`, `Plan` ni defaults comerciales.
- No regalar capacidades RRHH a planes que no las incluyan.
# ANV1-04 LOPDP, RBAC y auditoria de lectura

Objetivo: minimizar exposicion de datos personales y salariales.

Instrucciones:
- Revisar endpoints que retornan cedula, sueldo, gastos personales, cuentas bancarias o datos familiares.
- Revisar `C:\proyectos web\sinkroniq-mobile` para patrones LOPDP de consentimiento, exportacion, anonimizado y sanitizacion de auditoria.
- Implementar proyecciones por rol para datos sensibles.
- Registrar auditoria de lectura cuando se consulten datos salariales/personales masivos o sensibles.
- Persistir consentimientos versionados por usuario/alcance y distinguir base legal no revocable de consentimiento opcional.
- Implementar exportacion de datos personales y anonimizado controlado sin borrar obligaciones laborales/tributarias.
- Exponer pantalla PWA autenticada de privacidad.
- Asegurar `correlationId`, `userId`, entidad y finalidad.
- Agregar pruebas backend de rol y auditoria.
- Exponer mensajes claros cuando un rol no tenga permiso.
- Crear reporte de fase.
- Commit esperado: `phase: ANV1-04 task: lopdp rbac auditoria`.

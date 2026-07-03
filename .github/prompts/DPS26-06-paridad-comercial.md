# DPS26-06 paridad comercial

Objetivo: alinear promesa comercial, landing, planes, login, PWA y app movil sin duplicidad ni promesas incompletas.

Requiere aprobacion explicita del usuario.

Tareas:
- Crear matriz Oferta/Backend/PWA/App/Evidencia/Estado.
- Verificar que planes y landing usen una fuente de verdad.
- Mantener precios visibles en landing cuando corresponda, sin duplicar logica de checkout.
- Reusar lo avanzado localmente en `PublicPlansCatalog.jsx` y `publicPlanPresentation.js` si el contraste confirma que pertenece al sistema.
- Eliminar textos tecnicos visibles para clientes.
- Verificar navegacion de Planes, Login, Sitio publico y Resultado de pago.

Gates:
- `npm.cmd --workspace=frontend-web run build`
- Smoke visual local.
- Reporte de fase y `AuditLock.json` firmado.

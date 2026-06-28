# CONTRATO CDANV4 - CIERRE DEFINITIVO AUDITORIA SKNOMINA V4

## Contratos De Comportamiento

1. GET `/api/pagos/confirm` es retorno informativo y no activa planes.
2. Solo POST `/api/pagos/webhook` y `/api/pagos/webhook/payphone` pueden confirmar pagos con validacion de proveedor, referencia y monto.
3. Todo permiso solicitado desde mobile queda como novedad pendiente, con tipo `permiso_con_sueldo` o `permiso_sin_sueldo`.
4. RRHH/owner administra permisos desde la pantalla de novedades; al aprobarlos impactan el calculo segun catalogo.
5. El historial laboral agrupa roles, novedades, permisos y documentos por empleado, respetando tenant y rol.
6. Mobile solo consulta historial del empleado vinculado a su usuario.
7. La marca visible activa del sistema es SKNOMINA.
8. “Mi Nómina” es etiqueta funcional de autoservicio y no se reemplaza por marca.

## Gates

- Backend: tests especificos de rutas, pagos, mobile, comunicaciones y PDF.
- Frontend: build Vite.
- Mobile: check de readiness de app store.
- AuditLock: firma SHA256 con hash previo y timestamp.

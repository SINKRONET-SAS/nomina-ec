# Contrato ONI26-05 - SUPERADMIN

## Alcance

El entorno SUPERADMIN gobierna planes, addons, owners, contratos, incidencias y catalogos globales. No administra nomina operativa ni descarga datos personales de empleados sin flujo auditado y justificacion.

## Controles

- RBAC denegado por defecto.
- Toda accion sensible requiere `correlationId`, usuario actor, rol, tenant, recurso, resultado y fecha.
- Las sesiones de soporte deben estar asociadas a una incidencia.
- Los planes y addons se versionan como catalogo global, sin mezclar reglas operativas del OWNER.
- No se permite impersonacion silenciosa del OWNER.

## Evidencia versionada

- `backend/src/config/superadmin-operations-catalog.json`

## Pruebas esperadas

- Usuario SUPERADMIN no puede cerrar nomina ni descargar archivos bancarios de un tenant.
- Usuario SUPERADMIN_SUPPORT solo puede leer owners e incidencias.
- Toda accion de supervision genera auditoria con `correlationId`.

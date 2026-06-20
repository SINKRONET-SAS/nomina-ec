# CES26-01 - Modelo de evidencia

## Objetivo

Crear una fuente de evidencia minima para comunicaciones transaccionales sin almacenar contenido ni destinatarios en claro.

## Tareas

1. Agregar migracion `communication_events`.
2. Incluir tenant, usuario, correlacion, canal, proveedor, plantilla, estado, hash de destinatario y retencion.
3. Agregar indices por tenant/fecha, plantilla/estado y retencion.
4. Habilitar RLS compatible con tenant.
5. Actualizar Prisma schema.

## Cierre

`npx prisma validate` debe pasar.

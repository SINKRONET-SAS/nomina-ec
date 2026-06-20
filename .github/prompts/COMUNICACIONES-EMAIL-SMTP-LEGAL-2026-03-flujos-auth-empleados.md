# CES26-03 - Flujos auth y empleados

## Objetivo

Asegurar que verificacion de correo, recuperacion de clave e invitaciones laborales registren finalidad, tenant y usuario.

## Tareas

1. Propagar `tenantId` y `userId` desde registro publico/interno.
2. Propagar `tenantId` en recuperacion y reenvio de verificacion.
3. Propagar finalidad en invitaciones de empleados.
4. Mantener anti-enumeracion en recuperacion y reenvio.
5. No devolver codigos por API.

## Cierre

Los flujos deben conservar compatibilidad de respuesta existente.

# CES26-02 - Servicio de auditoria de comunicaciones

## Objetivo

Registrar eventos desde SMTP/WhatsApp con minimizacion de datos y manejo explicito de errores.

## Tareas

1. Crear `communicationAuditService`.
2. Usar HMAC con `COMMUNICATION_EVENT_HASH_SECRET`.
3. Permitir solo metadata tecnica segura.
4. Registrar eventos desde `communicationService`.
5. No bloquear el envio por fallos de auditoria, pero registrar error estructurado.

## Cierre

Tests unitarios deben demostrar que no se guardan correos, telefonos, codigos ni contenido.

# CSW26-01 - Servicio unico de comunicaciones

## Objetivo

Crear un servicio backend centralizado para SMTP y WhatsApp, sin secretos en logs ni respuestas.

## Tareas

1. Instalar dependencia SMTP segura.
2. Implementar `communicationService`.
3. Normalizar email y telefonos Ecuador.
4. Exponer estado de configuracion sin secretos.
5. Manejar estados `sent`, `dev_logged`, `not_configured`, `skipped` y `failed`.

## Cierre

El servicio debe ser unit-testable y no depender de credenciales reales para pruebas.

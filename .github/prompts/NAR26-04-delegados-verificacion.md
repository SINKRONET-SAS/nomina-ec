# NAR26-04 — Reenvío de verificación de delegados

Reutilizar la generación y envío de código existente. Crear una ruta autenticada y rate-limited para que owner/superadmin reenvíe la verificación de un usuario delegado activo del tenant que aún no tenga correo verificado.

No devolver ni persistir el código en claro. Invalidar tokens anteriores, emitir uno nuevo con vencimiento completo contado desde la emisión, confirmar antes del envío que `expira_en` está en el futuro y registrar comunicación y auditoría con propósito, correlación y vencimiento. Responder con mensaje seguro y errores diferenciados para usuario inexistente, verificado o inactivo. El código que llegue al usuario nunca puede ser uno caducado o próximo a caducar por reutilización.

Agregar acción visible en Usuarios y roles y prueba de autorización, tenant, idempotencia temporal y error seguro.

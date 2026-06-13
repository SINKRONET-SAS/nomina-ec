# HNBE26-06 - Beneficios, documentos y autoservicio

Fecha: 2026-06-12

## Estado actual

Existen documentos laborales basicos y finiquito. El mobile cubre marcacion y consulta de marcaciones, pero no autoservicio laboral completo.

## Cambios aplicados

- Errores de documentos legales responden con `correlationId`.
- Logs de documentos ahora incluyen `code`, `statusCode`, `correlationId`, `userId` y mensaje.

## Brechas

- Beneficios/prestamos/anticipos no tienen entidad dedicada.
- Roles de pago descargables requieren version, firma/aceptacion y auditoria de descarga.
- Autoservicio empleado debe incluir perfil, roles de pago, solicitudes, documentos y marcaciones.
- No se debe mezclar documento laboral con RIDE/XML fiscal.


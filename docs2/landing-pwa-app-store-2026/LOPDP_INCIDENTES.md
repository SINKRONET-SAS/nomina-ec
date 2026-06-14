# Procedimiento LOPDP de incidentes

## Alcance

Aplica a incidentes que afecten confidencialidad, integridad o disponibilidad de datos personales laborales tratados por Nomina-Ec.

## Flujo

1. Registrar incidente con fecha, fuente, tenant, sistemas afectados y responsable interno.
2. Contener acceso, credenciales, integraciones o despliegues comprometidos.
3. Preservar evidencia tecnica sin exponer datos reales en canales no autorizados.
4. Clasificar impacto: identificacion, contacto, asistencia, geolocalizacion, foto, cuenta bancaria, rol de pago o documentos laborales.
5. Notificar al responsable del tratamiento y definir si corresponde comunicacion a titulares o autoridad competente.
6. Ejecutar remediacion, monitoreo reforzado y cierre con lecciones aprendidas.

## Evidencia minima

- `correlationId`
- tenant y usuario afectado si aplica
- categoria de datos
- causa raiz
- decision de notificacion
- acciones correctivas

## Restricciones

- No enviar archivos con datos reales por correo no autorizado.
- No publicar capturas con datos personales en tickets publicos.
- No afirmar cumplimiento total sin revision legal.

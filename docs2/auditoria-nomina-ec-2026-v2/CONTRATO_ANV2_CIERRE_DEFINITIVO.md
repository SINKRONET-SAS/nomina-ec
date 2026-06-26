# Contrato ANV2 - Cierre definitivo

## Objetivo

Cerrar las brechas V2 sin falsas promesas comerciales. El sistema debe distinguir entre configuracion real, modo desarrollo y bloqueos operativos visibles.

## Contrato de comunicaciones

- `.env.example` debe declarar proveedor, remitente, host/puerto o API key segun el adaptador elegido.
- `communicationService` debe exponer readiness auditable: configurado, modo desarrollo, bloqueado o error.
- En produccion, ausencia de proveedor real no puede registrarse como entrega exitosa.
- Cada envio debe guardar canal, plantilla, destinatario minimizado, estado, proveedor, correlationId y error estructurado.
- La PWA debe mostrar si verificacion, recuperacion, invitaciones o notificaciones estan bloqueadas por configuracion.

## Contrato de timezone

- Defaults de mes/anio en nomina y reportes deben salir de un helper unico con `America/Guayaquil`.
- No usar `new Date()` directo para periodo inicial en pantallas operativas de nomina/reportes.
- Deben existir pruebas para borde: ultimo dia del mes, 22h Ecuador, UTC dia siguiente.
- Mobile y web deben compartir contrato de periodo; si mobile ya usa America/Guayaquil, web debe alinearse.

## Contrato de firmas legales

- Toda plantilla laboral generada debe tener version, fuente, fecha de generacion y estado de revision legal.
- Contratos y actas deben incluir empleador, RUC, representante legal, identificacion del representante, trabajador, cedula, cargo, fecha/lugar y bloques de firma.
- Roles de pago deben incluir bloque de recepcion/aceptacion del trabajador y emisor/representante o delegado autorizado segun politica legal.
- Si faltan datos del representante legal del tenant, la generacion debe fallar con error visible o generar borrador marcado como incompleto; nunca documento final silencioso.

## Compatibilidad

- No romper documentos historicos ya generados.
- Nuevas plantillas deben versionarse; no sobrescribir evidencia historica.
- Cambios de API deben mantener compatibilidad o documentar migracion.

## Cierre

ANV2 se cierra solo si backend, frontend web y app movil compilan, las pruebas pasan y AuditLock registra evidencias reales de cada gate.

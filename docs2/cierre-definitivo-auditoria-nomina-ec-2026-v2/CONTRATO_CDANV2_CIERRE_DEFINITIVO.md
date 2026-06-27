# Contrato CDANV2 - Cierre definitivo Auditoria Nomina-Ec 2026 V2

## Alcance

Este contrato define las condiciones tecnicas minimas para cerrar los hallazgos V2 nuevos. No autoriza runtime por si mismo; cada fase requiere aprobacion explicita y `AuditLock.json` firmado.

## Contrato legal SBU

- El sistema no debe degradar SBU 2026 a USD 470 por la auditoria fuente.
- El valor USD 482 solo puede cambiarse con fuente oficial versionada, fecha, responsable y evidencia adjunta.
- La PWA debe mostrar bloqueo claro si se intenta calcular con parametros legales sin validacion requerida para produccion.

## Contrato auth

- La autenticacion normal debe evitar consultas innecesarias por request si los claims firmados son suficientes.
- Las operaciones criticas deben conservar verificacion fresca contra BD o mecanismo equivalente de revocacion.
- Todo error de auth debe incluir codigo, mensaje, `correlationId` y estado HTTP consistente.

## Contrato superadmin y seed

- Un despliegue nuevo debe poder crear primer superadmin por comando seguro, idempotente y dependiente de variables de entorno.
- No se guardan claves ni usuarios reales en repositorio.
- Superadmin no puede quedar como pantalla vacia: debe consumir backend real o mostrar bloqueo accionable.

## Contrato reportes

- `Descargar PDF` de rol de pago debe entregar documento real o error visible con codigo.
- No se acepta archivo Excel disfrazado de PDF.
- Reportes consolidados deben consumir servicios existentes o crear endpoints versionados con pruebas.

## Contrato cierre mensual

- `cerrarMes()` debe ser idempotente ante doble click, doble request o concurrencia.
- Debe existir bloqueo transaccional o condicion atomica verificable.
- Notificaciones y auditoria no deben ocultar fallos operativos relevantes.

## Contrato pagos

- Stripe solo puede habilitarse con webhook firmado, idempotencia y conciliacion.
- Si Stripe no esta completo, debe quedar bloqueado visible.
- PayPhone debe preservarse como canal real existente.

## Contrato LOPDP

- La auditoria de comunicaciones debe minimizar datos personales.
- La retencion debe estar documentada por tipo de comunicacion.
- La purga debe ser auditable y reversible solo mediante backup autorizado, no por flujo normal.

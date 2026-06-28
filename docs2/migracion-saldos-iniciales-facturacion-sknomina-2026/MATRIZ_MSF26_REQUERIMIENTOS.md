# Matriz MSF26 - Migracion de saldos iniciales y facturacion

| ID | Prioridad | Area | Requerimiento | Criterio de cierre | Fase |
|----|-----------|------|---------------|--------------------|------|
| MSF-R01 | P0 | Diagnostico | Inventariar modelos SKNOMINA de empleados, nomina, beneficios, descuentos, novedades, contabilidad, pagos y planes. | Reporte runtime con rutas, tablas, riesgos y no duplicidades. | MSF26-01 |
| MSF-R02 | P0 | Facturador | Inventariar rutas y capacidades de SINKRONET FACTURADOR sin copiar secretos. | Contrato identifica endpoints candidatos y brechas server-to-server. | MSF26-01 |
| MSF-R03 | P0 | Modelo | Crear lote de migracion de saldos por tenant y periodo de corte. | Migracion reversible, indices, estados y auditoria definidos. | MSF26-02 |
| MSF-R04 | P0 | Staging | Cargar filas a staging antes de afectar datos operativos. | Prevalidacion muestra errores por fila y no modifica runtime. | MSF26-02/03 |
| MSF-R05 | P0 | Plantillas | Descargar plantilla CSV/XLSX versionada. | Plantilla incluye catalogos, ejemplo DEMO y columnas obligatorias. | MSF26-02/04 |
| MSF-R06 | P0 | Laboral | Saldos de vacaciones, decimos, fondo de reserva, anticipos, prestamos y beneficios recurrentes quedan representados. | Motor de nomina consume saldos iniciales sin recalcular periodos cerrados. | MSF26-03 |
| MSF-R07 | P0 | Contable | Registrar saldos contables iniciales por lote. | Ledger MSF26 y detalle de calculo identifican origen migracion y periodo de corte. | MSF26-03 |
| MSF-R08 | P0 | Seguridad | Validar tenant, empleado, cedula, periodo y permisos. | Owner/admin_rrhh autorizados; auditoria incluye `correlationId`. | MSF26-03/04 |
| MSF-R09 | P0 | Rollback | Reversa segura de lote no consolidado. | Runbook y endpoint/accion UI revierten solo el lote aprobado. | MSF26-03/04 |
| MSF-R10 | P0 | PWA | Exponer onboarding de migracion. | Pantalla con cargar, validar, aprobar, revertir, descargar errores e historial. | MSF26-04 |
| MSF-R11 | P0 | Perfil fiscal | Capturar/validar datos de facturacion del cliente SKNOMINA. | RUC/razon social/direccion/email y plan facturable completos antes de emitir. | MSF26-05/07 |
| MSF-R12 | P0 | API facturador | Cliente HTTP server-to-server hacia SINKRONET FACTURADOR. | TLS, base URL por env, token/HMAC por env, timeout, retry, circuito e idempotencia. | MSF26-05 |
| MSF-R13 | P0 | Payload fiscal | Mapear plan, periodo, subtotal, IVA, descuentos y forma de pago a factura. | Payload validado por contrato, sin valores negativos no permitidos ni decimales inconsistentes. | MSF26-05/06 |
| MSF-R14 | P0 | Evento facturable | Disparar factura tras pago/renovacion/activacion pagada. | Evento idempotente no duplica factura ante reintentos. | MSF26-06 |
| MSF-R15 | P0 | Webhook | Recibir estado de factura desde facturador. | Firma verificada, estados conciliados, auditoria y UI actualizada. | MSF26-06 |
| MSF-R16 | P1 | Reintentos | Reintento manual controlado. | PWA muestra errores y permite reintentar solo cuando corresponde. | MSF26-07 |
| MSF-R17 | P1 | Documentos | Mostrar documentos fiscales del cliente. | Pantalla de facturacion lista documentos con estado, numero, fecha y enlaces permitidos. | MSF26-07 |
| MSF-R18 | P0 | QA | Gates finales completos. | Tests, build, prisma, contratos, UTF-8, diff-check y AuditLock final. | MSF26-08 |

## Estados esperados

- `draft`: lote o factura preparada sin enviar.
- `validated`: saldos validados o payload fiscal listo.
- `approved`: saldos aprobados para commit.
- `committed`: saldos aplicados a runtime.
- `reverted`: lote revertido antes de consolidacion.
- `invoice_requested`: factura enviada al facturador.
- `invoice_authorized`: factura autorizada por facturador/SRI segun contrato.
- `invoice_rejected`: facturador rechazo la emision o SRI rechazo el comprobante.
- `blocked`: faltan datos, credenciales, certificado, secuencial, perfil fiscal o contrato.

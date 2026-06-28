# Contrato MSF26 - Migracion de saldos y facturacion fiscal

## Principios

1. MSF26 no modifica datos reales sin fase runtime aprobada, respaldo, dry-run exitoso y AuditLock firmado.
2. Los saldos iniciales se tratan como lote de migracion, no como nomina recalculada ni como edicion silenciosa de roles historicos.
3. SINKRONET FACTURADOR es la fuente de emision fiscal. SKNOMINA no debe duplicar firma XML, secuenciales SRI ni autorizacion.
4. Toda integracion externa falla cerrada en produccion si faltan URL, credenciales, firma, timeout, certificado o perfil fiscal.
5. Todo error operativo visible debe estar en espanol comercial y tener `correlationId` para soporte.

## Contrato de saldos iniciales

- Cada lote pertenece a un `tenant_id`, `periodo_corte`, `created_by`, `source_hash` y `status`.
- Cada fila debe registrar origen, empleado resuelto, tipo de saldo, moneda, valor, periodo aplicable, validaciones y error por fila si falla.
- El commit debe ser atomico por lote o por particion documentada. No se aceptan commits parciales sin reporte de compensacion.
- Los saldos no pueden tocar periodos `closed` salvo como saldo inicial en un periodo futuro o de apertura.
- La reversa debe afectar solo registros creados por el lote y conservar evidencia.
- Las plantillas deben versionarse para que una carga antigua pueda validarse con la regla correcta.

## Contrato API facturador

SKNOMINA enviara solicitudes de factura al facturador usando un cliente interno con estas condiciones:

- `SINKRONET_FACTURADOR_BASE_URL`: URL base por entorno, fuera del repo.
- `SINKRONET_FACTURADOR_API_KEY` o mecanismo HMAC/JWT equivalente: secreto fuera del repo.
- `Idempotency-Key`: obligatoria por evento comercial.
- `X-Correlation-Id`: obligatoria en cada llamada.
- Timeout explicito y reintentos limitados con backoff.
- Respuesta normalizada con `facturadorRequestId`, `estado`, `numero`, `claveAcceso`, `rideUrl`, `xmlUrl`, `mensaje` y `rawStatus` cuando aplique.
- El payload no debe incluir datos laborales de empleados. Solo datos fiscales/comerciales del cliente que recibe la factura SKNOMINA.

## Payload minimo esperado

```json
{
  "externalReference": "sknomina:tenant:periodo:evento",
  "customer": {
    "identificationType": "RUC",
    "identification": "0999999999001",
    "legalName": "Cliente Demo S.A.",
    "email": "facturacion@cliente.example",
    "address": "Direccion fiscal"
  },
  "invoice": {
    "issueDate": "2026-06-28",
    "currency": "USD",
    "items": [
      {
        "code": "SKNOMINA-MENSUAL",
        "description": "Servicio mensual SKNOMINA",
        "quantity": 1,
        "unitPrice": 0,
        "taxRate": 15
      }
    ],
    "payments": [
      {
        "method": "20",
        "amount": 0
      }
    ],
    "metadata": {
      "tenantId": "uuid",
      "planCode": "PYME",
      "billingPeriod": "2026-06"
    }
  }
}
```

El payload real debe ajustarse al contrato final del facturador y a los catalogos SRI vigentes. Los valores de ejemplo no son datos productivos.

## Contrato de webhook

- El facturador debe notificar cambios de estado con firma verificable.
- SKNOMINA debe validar firma, idempotencia y referencia antes de actualizar estado.
- Webhook desconocido o sin firma queda rechazado con error estructurado.
- El estado fiscal no activa pagos ni cambia plan por si solo; solo documenta cumplimiento tributario.

## Exposicion frontend obligatoria

- PWA debe mostrar estado de carga de saldos iniciales y permitir actuar desde una pantalla operativa.
- PWA debe mostrar estado de facturacion fiscal por cliente/plan: no configurado, listo, solicitado, autorizado, rechazado, bloqueado.
- Si el facturador no esta configurado, el usuario debe ver el bloqueo y la accion requerida.

## Fuera de alcance sin nueva aprobacion

- Copiar certificados, claves o secretos desde `sinkroniq-mobile`.
- Acceder directamente a la base de datos del facturador.
- Emitir facturas reales en ambiente productivo durante diagnostico.
- Reescribir SINKRONET FACTURADOR dentro de SKNOMINA.

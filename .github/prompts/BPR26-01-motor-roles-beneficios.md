# BPR26-01 — Motor y persistencia de roles de beneficios

## Autorización

Ejecutar esta fase después de BPR26-00 firmado.

## Instrucciones

1. Crear migración reversible y modelos de rol/detalle de beneficios tenant-aware.
2. Implementar cálculo para décimo tercero, décimo cuarto, participación laboral, salario digno y fondos de reserva.
3. Guardar provisión, base de pago, SBU/SMV de provisión, SBU/SMV de pago, ajuste, destino y parámetros.
4. Validar fechas legales de Ecuador y modalidades del empleado sin modificar la nómina mensual histórica.
5. Impedir doble pago y cierres incompletos mediante transacción e idempotencia.
6. Emitir errores estructurados con correlación y auditoría.

## Salida obligatoria

Pruebas unitarias del motor y AuditLock actualizado a `BPR26-01`.

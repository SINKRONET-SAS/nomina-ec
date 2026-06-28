# REPORTE MSF26-02 - Modelo de saldos iniciales

Fecha: 2026-06-28  
Estado: completed_local

## Implementacion

- Migracion Prisma SQL: `backend/prisma/migrations/20260628143000_msf26_initial_balances_fiscal_billing/migration.sql`.
- Tablas creadas:
  - `initial_balance_batches`: lote, tenant, fecha de corte, hash, estado, resumen, usuario y tiempos.
  - `initial_balance_items`: filas validadas, empleado, tipo de saldo, periodo, valores, errores y metadata.
  - `fiscal_invoice_requests`: solicitudes fiscales, estado, idempotencia, payload, referencias y ultimo error.
- Indices por tenant, estado, periodo, lote, empleado, referencia externa e idempotencia.

## Catalogo de saldos

- `vacaciones_dias`
- `decimo_tercero`
- `decimo_cuarto`
- `fondo_reserva`
- `anticipo`
- `prestamo`
- `beneficio_recurrente`
- `descuento_recurrente`
- `horas_extra_banco`

## Reglas

- No se modifican periodos cerrados.
- Cada carga genera hash por tenant, fecha de corte y contenido normalizado.
- La plantilla queda versionada como `MSF26-v1`.
- El motor de nomina consume saldos comprometidos como ajustes iniciales de ingresos/deducciones cuando el periodo esta abierto.

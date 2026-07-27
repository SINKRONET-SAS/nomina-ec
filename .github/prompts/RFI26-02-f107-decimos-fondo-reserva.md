# RFI26-02 - Formulario 107: decimos y fondo de reserva

- **Plan**: `HAIKY-RDEP-F107-IESS-CUMPLIMIENTO-2026`
- **Codigo fase**: `RFI26-02`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `RFI26-01` firmado

## Objetivo

Agregar decimo tercer sueldo, decimo cuarto sueldo y fondo de reserva al resumen anual del Formulario 107.

## Tareas

### RFI26-02-T1: buildSummary — acumular campos faltantes

En `sriFormulario107Service.js` funcion `buildSummary`:
- Agregar acumulador `decimoTercero` sumando `provisionDecimoTercero` de detalle_calculo
- Agregar acumulador `decimoCuarto` sumando `provisionDecimoCuarto` de detalle_calculo
- Agregar acumulador `fondoReserva` sumando `fondoReservaPagadoEmpleado + fondoReservaDepositadoIess`

### RFI26-02-T2: buildFormulario107Pdf — filas en tabla resumen

- Agregar filas al resumen anual:
  - 'Decimo tercer sueldo' -> decimoTercero
  - 'Decimo cuarto sueldo' -> decimoCuarto
  - 'Fondo de reserva' -> fondoReserva
- Ubicar despues de 'Otros ingresos gravados' y antes de 'Total ingresos'

### RFI26-02-T3: Actualizar test F107

- Verificar que buildSummary incluye los nuevos campos
- Agregar test data con provisiones en detalle_calculo

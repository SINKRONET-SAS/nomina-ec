# RFI26-01 - RDEP: desagregacion de ingresos

- **Plan**: `HAIKY-RDEP-F107-IESS-CUMPLIMIENTO-2026`
- **Codigo fase**: `RFI26-01`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `RFI26-00` firmado

## Objetivo

Corregir el generador RDEP para que los campos `suelSal`, `sobSuelComRemu` y `otrosIngRenGrav` reflejen la desagregacion real de ingresos del empleado segun el XSD SRI.

## Tareas

### RFI26-01-T1: aggregateAnnualRows — nuevos acumuladores

En `sriRdepGenerator.js` funcion `aggregateAnnualRows`:
- Agregar `sueldoBase_anual` = sum de `sueldo_bruto` de cada row
- Agregar `extras50_anual` = sumDetail(rows, 'montoExtras50')
- Agregar `extras100_anual` = sumDetail(rows, 'montoExtras100')
- Agregar `extrasNocturnas_anual` = sumDetail(rows, 'montoExtrasNocturnas')
- Agregar `sobresueldo_anual` = extras50 + extras100 + extrasNocturnas
- Agregar `otrosIngresos_anual` = max(0, totalIngresos - sueldoBase - sobresueldo - fondoReserva)

### RFI26-01-T2: buildRdepRecord — mapeo correcto

- `suelSal` = sueldoBase_anual (solo sueldo base)
- `sobSuelComRemu` = sobresueldo_anual (extras + bonos)
- `otrosIngRenGrav` = otrosIngresos_anual (residual)
- `ingGravConEsteEmpl` = totalIngresos (sin cambio, correcto)

### RFI26-01-T3: estab dinamico

- Reutilizar logica de `resolveIessEstablishmentCode` de `iessSaeGenerator.js`
- Cargar configuracion del tenant en `loadRdepData`
- En `buildRdepRecord`, pasar el establishment code resuelto
- Fallback a '001' si no esta configurado
- Truncar a 3 digitos (formato RDEP) vs 4 digitos (formato IESS)

### RFI26-01-T4: Actualizar tests RDEP

- Verificar que el test existente sigue pasando con la nueva desagregacion
- Agregar test que valida sobSuelComRemu cuando hay horas extras

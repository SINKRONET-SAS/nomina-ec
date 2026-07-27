# RFI26-03 - IESS Batch: sueldo IESS y movimientos ENT/SAL

- **Plan**: `HAIKY-RDEP-F107-IESS-CUMPLIMIENTO-2026`
- **Codigo fase**: `RFI26-03`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `RFI26-02` firmado

## Objetivo

Corregir el sueldo MSU para excluir ingresos no-IESS y agregar generacion de movimientos ENT (aviso de entrada) y SAL (aviso de salida).

## Tareas

### RFI26-03-T1: MSU sueldo IESS-subject

En `iessSaeGenerator.js`:
- Agregar `n.detalle_calculo` al SELECT de `loadSaeData`
- Calcular sueldo IESS: si `detalle_calculo.novedadesResumen.incomeNotAffectsIess > 0`, restar de `total_ingresos`
- `sueldoIess = total_ingresos - incomeNotAffectsIess`
- Fallback: si no hay detalle, usar `total_ingresos` (backward compatible)
- Usar `sueldoIess` en `buildIessBatchTxt` en vez de `total_ingresos`

### RFI26-03-T2: Movimiento ENT (aviso de entrada)

- Agregar layout ENT al manifiesto `sae-source-manifest.json`
- Layout ENT: `RUC;ESTABLECIMIENTO;ANIO;MES;ENT;CEDULA;FECHA_INGRESO;SUELDO`
- Funcion `buildIessBatchEntTxt` que genera lineas para empleados nuevos del periodo
- Query: empleados con `fecha_ingreso` dentro del periodo solicitado

### RFI26-03-T3: Movimiento SAL (aviso de salida)

- Agregar layout SAL al manifiesto
- Layout SAL: `RUC;ESTABLECIMIENTO;ANIO;MES;SAL;CEDULA;FECHA_SALIDA;MOTIVO_SALIDA`
- Funcion `buildIessBatchSalTxt` para empleados con `fecha_salida` en el periodo
- Motivo normalizado desde campo `motivo_salida` del empleado

### RFI26-03-T4: Endpoint y precheck multi-tipo

- Extender `generarArchivoIessBatch` para aceptar `movementType` (MSU, ENT, SAL)
- Adaptar `precheckSAE` para cada tipo de movimiento
- Actualizar controlador para pasar el tipo desde el request
- Actualizar `sae-source-manifest.json` con tipos soportados

### RFI26-03-T5: Tests IESS

- Test MSU con ingreso no-IESS (anticipo movilizacion): sueldo debe excluirlo
- Test ENT genera linea correcta con fecha de ingreso
- Test SAL genera linea correcta con fecha y motivo de salida

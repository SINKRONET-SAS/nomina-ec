# Reporte ANV2-03 - Timezone Ecuador

## Objetivo

Cerrar TZ-C01: los periodos operativos de nomina y reportes no deben depender del timezone local del navegador o servidor.

## Cambios runtime

- `frontend-web/src/utils/dateFormat.js`
  - Centraliza `ECUADOR_TIME_ZONE = America/Guayaquil`.
  - Agrega `currentPeriodEC()` y `firstDayOfPeriodEC()`.
- PWA web
  - `CerrarMes.jsx`, `DescargarReportes.jsx`, `RolesPagos.jsx` y `Beneficios.jsx` inicializan mes/anio desde `currentPeriodEC()`.
  - Las pantallas muestran que el periodo inicial se calcula con `America/Guayaquil`.
  - `Dashboard.jsx` alinea el periodo operativo con el helper Ecuador.
- Backend
  - `monthlyPeriodService.js` expone `currentPeriodInEcuador()`.
  - `payrollAccountingController.js` usa el periodo Ecuador como fallback API para matriz contable.
- Contratos de sistema
  - `scripts/verify-system-contracts.mjs` falla si las pantallas de nomina/reportes vuelven a usar `new Date()` o `getMonth() + 1` para defaults de periodo.

## Resultado

TZ-C01 queda cerrado en runtime y protegido por contrato estatico.

## Pruebas

- `npm.cmd run contracts`: OK.

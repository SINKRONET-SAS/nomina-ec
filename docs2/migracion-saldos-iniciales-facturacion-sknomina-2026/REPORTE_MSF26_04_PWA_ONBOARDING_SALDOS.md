# REPORTE MSF26-04 - PWA onboarding de saldos

Fecha: 2026-06-28  
Estado: completed_local

## Frontend

- Pagina nueva: `frontend-web/src/pages/Onboarding/SaldosIniciales.jsx`.
- Ruta protegida: `/dashboard/onboarding/saldos-iniciales`.
- Menu: Empleados -> Saldos iniciales.

## Funcionalidad visible

- Descarga de plantilla CSV.
- Descarga de plantilla Excel.
- Carga de CSV con lectura de filas.
- Fecha de corte.
- Prevalidacion de lote.
- Historial de lotes.
- Detalle de filas, errores, estado, empleado y valores.
- Aplicacion de saldos validados.
- Reversa de lote aplicado.

## Resultado

El onboarding de saldos iniciales queda visible en PWA y no mezclado con reportes de nomina.

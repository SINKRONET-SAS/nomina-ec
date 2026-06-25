# Reporte CRN26-07 - Frontend PWA

## Estado

Completado localmente.

## Entregables

- `Parametrizacion.jsx` agrega formulario `Esquema contable`.
- El formulario permite crear/editar concepto, categoria, asiento, cuentas debe/haber, centro de costo, desglose por empleado, estado y vigencia.
- `DescargarReportes.jsx` agrega:
  - `Detalle por empleado`.
  - `Matriz empleados x beneficios`.
  - `Reporte contable CRN26`.
  - `Asientos contables legacy`.
- PDF queda limitado al resumen; los reportes CRN26 tabulares usan XLSX/CSV.

## Gate

- `npm.cmd run build` en `frontend-web`: PASS.

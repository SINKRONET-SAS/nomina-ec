# Reporte ONI26-FUNC-01 - Segunda pasada funcional integral

## Motivo

La ejecucion ONI26 inicial dejo demasiados entregables como contratos, manifiestos o configuraciones no operables desde la interfaz. Esta segunda pasada corrige ese enfoque: cada modulo del plan debe tener pantalla, importacion, ruta, accion persistente o integracion runtime verificable.

## Entregables funcionales

- Tabla de impuesto a la renta anual con intervalos editables en `Parametrizacion`.
- Validacion backend de tabla IR: fraccion basica, exceso hasta, impuesto de fraccion basica y porcentaje decimal.
- Motor de nomina actualizado para priorizar `legal_parameter_versions` cuando exista `income_tax_table` del tenant o global.
- Centro de operacion integral ONI26 con formularios persistentes para:
  - mapeo contable,
  - RDEP,
  - SUPERADMIN planes,
  - OWNER bancos,
  - usuarios y accesos,
  - API de integracion,
  - asistencia,
  - empresa DEMO,
  - apertura mensual,
  - carga masiva de empleados,
  - reportes,
  - dashboard,
  - mensajes tecnicos,
  - sitio publico,
  - PWA y stores.
- Nueva ruta frontend `/dashboard/operacion/integral`.
- Menu lateral actualizado con `Operacion integral`.

## Validaciones

- `npm.cmd run build` en `frontend-web`.
- `node --check backend/src/services/configurationService.js`.
- `node --check backend/src/services/legalParameterService.js`.

## Pendiente de siguientes pasadas

Esta pasada convierte el plan en operable y persistente. Queda pendiente profundizar cada modulo con endpoints especializados donde corresponda, por ejemplo importacion real de archivo CSV/XLSX, emision RDEP validada contra XSD y llaves API reales con rotacion.

# CDANV3-05 - Movilizacion mobile SQLite

Objetivo: crear la base offline de gastos de movilizacion en app movil.

Implementar:
- Dependencia SQLite compatible con Expo actual.
- `app-movil/src/db/movilizacion.js`.
- Pantalla `GastosMovilizacionScreen` con registro diario, listado, total y cierre mensual.
- Tab comercial `Movilizacion` o `Moviliz.` sin romper tabs existentes.
- Mensajes sin codigos internos.

Validar:
- Parse/check mobile.
- Alta/listado/eliminacion local de gastos.
- Estado offline sin perdida de datos.

Cierre:
- Reporte `REPORTE_CDANV3_05_MOVILIZACION_MOBILE_SQLITE.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-05 task: movilizacion-mobile-sqlite`.

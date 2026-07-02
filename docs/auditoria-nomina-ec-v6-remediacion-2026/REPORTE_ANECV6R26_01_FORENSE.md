# REPORTE ANECV6R26 - FASE 01 FORENSE

## Fuente auditada

Los archivos fuente referenciados por el usuario muestran que V6 es un alias de V65:

- `AuditoriaNominaEC2026V6.jsx` importa `HALLAZGOS_V65`, `SCRIPTS_V65`, `PLAN_V65` y expone el texto `nomina-ec publico`.
- `nominaec_v6_hallazgos.jsx` y `nominaec_v6_scripts.jsx` son re-exports hacia `../v65/`.

## Evidencia de repo cruzado

1. La cabecera del dashboard dice `Auditoria Nomina-EC V6 · nomina-ec publico`.
2. El resumen ejecutivo menciona `app-movil`, `frontend-web` y `RolesPagos.jsx`, superficies que no existen en `sinkroniq-mobile`.
3. `sinkroniq-mobile` si contiene integracion `SKNOMINA` pero como API externa de facturacion, no como producto de nomina con roles de pago.

## Contraste puntual

### SA-01
- **Fuente:** render sin seed superadmin.
- **Repo real:** `backend/scripts/seed-superadmin.js` y `backend/scripts/create-superadmin.js` existen.
- **Resultado:** hallazgo parcialmente valido. El problema real era de ejecucion en Render, no de ausencia de script.

### PAY-01
- **Fuente:** PayPhone en mock por falta de variables reales.
- **Repo real:** `render.yaml` ya declara `PAYPHONE_SECRET`, `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID`.
- **Resultado:** falso positivo para este repo.

### MOV-01/02/03
- **Fuente:** sin `expo-sqlite`, sin pantalla de gastos, sin modelos de movilidad.
- **Repo real:** `mobile/package.json` ya incluye `expo-sqlite`.
- **Resultado:** hallazgo cruzado de producto. No aplica a `sinkroniq-mobile`.

### REP-01 / EMAIL-01 / AUT-02
- **Fuente:** endpoints y pantallas de nomina (`rol-pdf`, `RolesPagos.jsx`, permisos empleado).
- **Repo real:** esas superficies no existen en este monorepo fiscal.
- **Resultado:** fuera de alcance del repo destino.

## Decision de remediacion

Se remedia solo el hallazgo intersectado y verificable en `sinkroniq-mobile`:

- bootstrap de `SUPERADMIN` en Render.

Los demas hallazgos quedan documentados como:

- `fuente externa`
- `no aplica en repo destino`
- `o falso positivo por evidencia de codigo real`

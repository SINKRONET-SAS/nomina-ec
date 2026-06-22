# Reporte E2E26-09 - Cierre runtime local

Fecha local: 2026-06-22  
Plan: `HAIKY-DIAGNOSTICO-E2E-CORRECCION-DEFINITIVA-NOMINA-EC-2026`  
Codigo: `E2E26`

## Resultado

E2E26 queda ejecutado localmente para las fases 01..09. El runtime ahora bloquea estados ambiguos del flujo end-to-end de Nomina-Ec y deja evidencia de la demo comercial lista para revision.

## Cambios aplicados

- `empleados.cedula` pasa de unicidad global a unicidad por `tenant_id + cedula`.
- Alta manual, importacion y seed demo validan cedula dentro del tenant.
- Login backend deja de seleccionar silenciosamente el usuario mas reciente por email.
- PWA y app movil aceptan RUC opcional para resolver correo multi-tenant.
- Invitaciones de app vencidas pasan a `EXPIRED` al listar o reenviar.
- App movil expone inicio/fin de almuerzo.
- Backend valida secuencia diaria de marcacion: inicio jornada, inicio almuerzo, fin almuerzo y fin jornada.
- Nomina ejecuta prechequeo E2E26 antes de calcular y cerrar.
- El prechequeo bloquea calculo/cierre si no existe OWNER/RRHH con correo verificado.
- Calculo con errores por empleado deja el periodo en `calculation_failed`.
- Cierre exige periodo calculado, novedades sin pendientes, empleados activos con nomina borrador y fichas operativas.
- Reapertura exige periodo cerrado, motivo minimo y registra `lastReopen` en `payroll_periods.summary`.
- Pantalla `Cerrar Mes` muestra blockers/warnings del prechequeo.

## Migraciones

- `backend/prisma/migrations/20260622164000_e2e26_employee_cedula_by_tenant/migration.sql`

Aplicada localmente con `npx.cmd prisma migrate deploy`.

## Demo comercial

Se ejecuto primero `npm.cmd run seed:demo:reset`, como fue solicitado. Ese comando elimina el tenant demo DCEN26, por lo que luego se ejecuto `npm.cmd run seed:demo` y `npm.cmd run seed:demo:verify` para dejar la demo reconstruida y lista para revision comercial.

Conteos verificados:

- Tenants demo: 1
- Usuarios: 4
- Empleados: 30
- Cargas familiares: 20
- Zonas: 2
- Unidades: 6
- Jornadas: 2
- Marcaciones: 1.284
- Novedades: 101
- Periodos cerrados: 5
- Roles cerrados: 150
- Perfiles bancarios: 1

## Gates

| Gate | Resultado |
|------|-----------|
| `npx.cmd prisma validate` | PASS |
| `npx.cmd prisma migrate deploy` | PASS |
| `npm.cmd run seed:demo:reset` | PASS |
| `npm.cmd run seed:demo` | PASS |
| `npm.cmd run seed:demo:verify` | PASS |
| `npm.cmd test -- --runInBand` backend | PASS, 27 suites / 105 tests |
| `npm.cmd run smoke:pwa` frontend-web | PASS |
| `npm.cmd run check:stores` app-movil | PASS |
| `npm.cmd run doctor` app-movil | PASS, 18/18 checks |

## Riesgos residuales

- Roles PDF productivos siguen dependiendo de generacion/almacenamiento real; E2E26 deja warning operativo si faltan.
- La captura de foto movil no se agrego para no introducir dependencia nueva en Expo Go; backend mantiene soporte `fotoBase64`.
- Reversos contables de beneficios ante reapertura requieren contrato contable/productivo antes de prometer automatizacion total.
- Revision profesional legal, contable y LOPDP sigue requerida antes de produccion.

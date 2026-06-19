# REPORTE DVN26-09 CIERRE RUNTIME

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Codigo: `DVN26`  
Fecha: 2026-06-18  
Estado: `completed_runtime_local_iess_validated`

## Alcance ejecutado

Se ejecutaron DVN26-01..09 con aprobacion explicita del usuario en una sola pasada. Los scripts Base44/Deno adjuntos se usaron como referencia funcional, no como parches literales.

## Cambios principales

- `novedades_asistencia` ahora guarda `period_id`, `periodo_nomina` y `monto`.
- `AttendanceNoveltyType` agrega `bono_desempeno`.
- Los lotes de novedades, carga manual, API externa, atraso automatico y cron de faltas sellan periodo.
- El motor de nomina suma bonos aprobados a `total_ingresos`.
- El cierre de nomina descuenta beneficios de forma idempotente por periodo.
- Los reportes de nomina agregan CSV y columna de bonos.
- Landing/PWA eliminan textos de demo/ficticio y usan assets PNG 192/512.

## Migracion aplicada

- `backend/prisma/migrations/20260618133000_dvn26_bonus_novelty_amount/migration.sql`

PostgreSQL local:

- Base: `plan_haiky`
- Host: `127.0.0.1:5432`
- Resultado: migracion aplicada con `npx.cmd prisma migrate deploy`.

## Validaciones

| Gate | Resultado |
|------|-----------|
| Prisma validate | PASS |
| Prisma migrate deploy | PASS |
| Prisma generate | PASS |
| Node syntax checks | PASS |
| Backend tests completos | PASS, 19 suites, 74 tests |
| Frontend build | PASS |
| PWA smoke | PASS |
| Expo Doctor | PASS, 21/21 |
| Store readiness app | PASS |

## Validacion IESS

E-01 queda cerrado con fuente oficial IESS. La pagina `Servicios y prestaciones` del IESS confirma que al afiliado le corresponde aportar 9.45% de su sueldo o salario y al empleador 11.15% del salario del trabajador.

Fuente: `https://www.iess.gob.ec/en/web/afiliado/servicios-y-prestaciones`.

## Rollback tecnico

Rollback de runtime:

- Revertir el commit DVN26.
- En base local, revertir la migracion si fuese necesario mediante migracion compensatoria que elimine dependencias de `bono_desempeno`, `monto`, `period_id` y `periodo_nomina` solo si no existen datos productivos dependientes.

Rollback operativo:

- Si ya existen novedades con `bono_desempeno`, exportarlas antes de cualquier reversa.
- Si ya se cerro nomina con descuentos idempotentes, conservar `metadata.descuentosNomina` como evidencia y ajustar por nota contable, no por borrado silencioso.

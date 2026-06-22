# Reporte DCEN26 - Reejecucion runtime 2026-06-22

Plan: `HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026`  
Codigo: `DCEN26`  
Fecha: 2026-06-22  
Modo: reejecucion local de prompts/gates DCEN26-00..08 sobre runtime existente.

## Resumen

Se reejecuto la linea DCEN26 como validacion runtime local. El seed comercial idempotente reconstruyo la empresa demo y `seed:demo:verify` confirmo los conteos esperados. No se aplicaron cambios de runtime adicionales fuera del seed demo ni se tocaron tenants productivos.

## Comandos ejecutados

- `npx.cmd prisma validate` en `backend`.
- `npm.cmd run seed:demo` en `backend`.
- `npm.cmd run seed:demo:verify` en `backend`.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run smoke:pwa` en `frontend-web`.
- `npm.cmd run check:stores` en `app-movil`.

## Resultado seed demo

`npm.cmd run seed:demo` reconstruyo y verifico:

| Elemento | Resultado |
|----------|-----------|
| Tenants demo DCEN26 | 1 |
| Usuarios demo | 4 |
| Empleados ficticios | 30 |
| Cargas familiares demo | 20 |
| Zonas de marcacion | 2 |
| Unidades Quito/Guayaquil | 6 |
| Jornadas | 2 |
| Marcaciones mayo 2026 | 1284 |
| Novedades | 101 |
| Periodos cerrados 2026 | 5 |
| Roles cerrados 2026 | 150 |
| Perfiles bancarios demo | 1 |

Tenant runtime resembrado: `5552e818-b33d-40c4-b21c-1f2ac487a090`.

## Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Prisma schema | PASS | `npx.cmd prisma validate`: schema valido. |
| Seed demo | PASS | `npm.cmd run seed:demo`: demo sembrada y verificada. |
| Verificacion demo | PASS | `npm.cmd run seed:demo:verify`: conteos esperados confirmados. |
| Backend tests | PASS | 27 suites, 105 tests. |
| PWA smoke | PASS | Build Vite, manifest y service worker aprobados por smoke LPA26. |
| Stores/app config | PASS | `check:stores`: configuracion, identificadores, URLs y assets verificados. |

## Notas

- `backend/.demo-credentials.json` fue generado localmente y esta ignorado por git.
- `BANK_ACCOUNT_ENCRYPTION_KEY` puede permanecer vacio en `.env` local; el seed usa clave demo efimera fuera de produccion.
- No se ejecuto `seed:demo:reset` porque el objetivo era dejar la demo disponible para revision comercial.
- Persisten cambios documentales E2E26 no relacionados en el working tree; no fueron revertidos ni sobrescritos.

# PLAN HAIKY - AUDITORIA NOMINA-EC V6 - REMEDIACION 2026

**Codigo Plan:** ANECV6R26  
**Nombre:** HAIKY-AUDITORIA-NOMINA-EC-V6-REMEDIACION-2026  
**Fecha:** 2026-07-01  
**Repo de ejecucion:** `C:\proyectos web\sinkroniq-mobile`  
**Fuente obligatoria:** `RULES.md`  
**Fuente externa de auditoria:**  
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V6.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v6_hallazgos.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v6_scripts.jsx`

## Resumen Ejecutivo

La fuente V6 corresponde al producto `nomina-ec publico` y no a `sinkroniq-mobile`.  
Por eso este plan arranca con una fase forense obligatoria: no trasladar hallazgos entre repos sin contraste directo.

Resultado esperado del plan:

1. Separar hallazgos V6 no aplicables en `sinkroniq-mobile`.
2. Remediar solo la interseccion real encontrada en este monorepo.
3. Dejar evidencia documental y gates para evitar reabrir falsos positivos por cruce de producto.

## Hallazgos V6 contrastados contra sinkroniq-mobile

| ID fuente | Estado en sinkroniq-mobile | Resultado |
| --- | --- | --- |
| SA-01 render sin seed | **Aplica parcialmente** | Existe `seed-superadmin.js`, pero Render no lo ejecutaba y el wrapper no era autonomo. Se remedia en este plan. |
| REP-01 rol PDF inexistente | **No aplica** | `sinkroniq-mobile` no contiene el modulo de nomina con `RolesPagos.jsx` ni el endpoint `rol-pdf`. |
| EMAIL-01 envio de rol por email inexistente | **No aplica** | Este repo no implementa el flujo de roles de pago de nomina-ec. |
| MOV-01/02/03 SQLite movilizacion ausente | **No aplica / FP cruzado** | `mobile/package.json` ya incluye `expo-sqlite`; ademas este mobile no es la app de nomina auditada. |
| PAY-01 PayPhone en mock | **Falso positivo en este repo** | `render.yaml` ya declara `PAYPHONE_SECRET`, `PAYPHONE_TOKEN` y `PAYPHONE_STORE_ID`. |
| AUT-02 empleado sin autoservicio de permisos | **No aplica** | El autoservicio descrito pertenece al producto de nomina, no a este mobile fiscal. |

## Fases

| Fase | Codigo | Objetivo |
| --- | --- | --- |
| 00 | ANECV6R26-00 | Baseline y gobierno |
| 01 | ANECV6R26-01 | Contraste forense V6 externo vs repo real |
| 02 | ANECV6R26-02 | Remediacion SUPERADMIN seed en Render |
| 03 | ANECV6R26-03 | Contraste de integracion SKNomina/API y limites del repo |
| 04 | ANECV6R26-04 | Verificacion PayPhone y despliegue |
| 05 | ANECV6R26-05 | Verificacion mobile, movilidad y autoservicio fuera de alcance |
| 06 | ANECV6R26-06 | Gates tecnicos y anti-deriva |
| 07 | ANECV6R26-07 | Reportes y documentacion canonica |
| 08 | ANECV6R26-08 | Cierre y AuditLock |

## Cambio tecnico principal

Se implementa un `seed-superadmin` idempotente para Render:

- si ya existe un `SUPERADMIN` activo, no crea otro;
- si no existe uno activo, exige `SUPERADMIN_EMAIL`, `SUPERADMIN_NAME` y `SUPERADMIN_PASSWORD`;
- el `buildCommand` de la API ahora ejecuta `npm run seed:superadmin`;
- `render.yaml` declara las variables `SUPERADMIN_*` como `sync: false`.

## Gates minimos

- `npm.cmd test --workspace=backend -- --runTestsByPath __tests__/seedSuperadminScript.test.js`
- `npm.cmd run audit:integral-quality`
- `npm.cmd run lint --workspaces --if-present`
- `git diff --check`

## Regla especial de este plan

No se portan automaticamente hallazgos entre `nomina-ec` y `sinkroniq-mobile`.  
Toda auditoria externa debe demostrar primero:

1. repo fuente real,
2. archivos reales del repo destino,
3. interseccion funcional directa,
4. contrato publico afectado.

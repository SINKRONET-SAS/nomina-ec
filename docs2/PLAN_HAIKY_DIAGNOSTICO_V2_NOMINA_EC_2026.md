# PLAN HAIKY DIAGNOSTICO V2 NOMINA-EC 2026

Codigo: `DVN26`  
Estado: `completed_runtime_local_with_professional_iess_block`  
Fecha: 2026-06-18  
Fuente principal: `C:\proyectos web\sensible-easy-payroll-flow\src\docs\DIAGNOSTICO_V2_NOMINA_EC.md`  
Scripts de referencia: `07_fix_nomina_calculos.js`, `08_backend_acta_finiquito_contrato.js`, `09_backend_contrato_trabajo.js`, `10_pwa_landing.js`, `11_fix_multitenant_reportes_planes.js`

## Proposito

Cerrar los 31 hallazgos del Diagnostico V2 sin copiar la arquitectura Base44/Deno del prototipo. Cada script adjunto se trata como referencia funcional y de criterios, no como parche directo. La implementacion debe mapearse al stack real de Nomina-Ec: Express, PostgreSQL, Prisma, React/Vite, Expo, AuditLog, parametros legales versionados, RBAC, tenantId y servicios backend existentes.

## Regla de arranque

DVN26-00 fue documental. El usuario aprobo ejecutar DVN26-01..09 en una sola pasada el 2026-06-18. Las fases runtime se ejecutaron sobre codigo real con AuditLock valido y commit con formato:

`phase: DVN26-XX task: <descripcion>`

## Hallazgos cubiertos

| Bloque | Hallazgos | Fases |
|--------|-----------|-------|
| Legal y calculo | E-01..E-08 | DVN26-01, DVN26-02, DVN26-03 |
| Backend sin pantalla | B-01..B-06 | DVN26-04, DVN26-05 |
| Pantallas decorativas | D-01..D-05 | DVN26-02, DVN26-06, DVN26-07 |
| Funciones faltantes | F-01..F-08 | DVN26-03, DVN26-06, DVN26-07, DVN26-08 |
| Deuda tecnica | T-01..T-04 | DVN26-02, DVN26-07, DVN26-09 |

## Fases

| Fase | Prioridad | Objetivo | Runtime |
|------|-----------|----------|---------|
| DVN26-00 | P0 | Baseline documental, matriz, contexto, prompts y AuditLock | No |
| DVN26-01 | P0 | Parametros legales oficiales, IESS 9.45/9.95 como decision bloqueante y tabla IR editable/versionada | Si |
| DVN26-02 | P0 | Motor unico de nomina: dias proporcionales, fondo reserva, bonos, cerradas protegidas y cuotas | Si |
| DVN26-03 | P0 | Liquidacion, acta de finiquito y contrato laboral PDF con DocumentoLegal y evidencia | Si |
| DVN26-04 | P1 | Beneficios, cuotas y cierre de nomina idempotente con auditoria | Si |
| DVN26-05 | P1 | Procesos backend visibles: crons, AuditLog, equipos y documentos legales | Si |
| DVN26-06 | P1 | Archivos bancarios y reportes Excel/PDF/CSV por persona y estructura organizativa | Si |
| DVN26-07 | P0 | Multi-tenant real, enforcement de planes y reportes filtrados por tenant/anio | Si |
| DVN26-08 | P1 | Landing, PWA y app movil enfocadas en confianza y marcacion de asistencia | Si |
| DVN26-09 | P0 | QA, regresion, rollback, evidencia legal/contable y release gate | Si |

## Ejecucion runtime local 2026-06-18

DVN26-01..09 quedaron ejecutadas localmente sobre el stack real. No se aplicaron scripts Base44/Deno literalmente; se tradujeron los criterios a Express, PostgreSQL/Prisma, React/Vite y Expo.

Cambios runtime principales:

- Novedades de nomina incorporan `period_id`, `periodo_nomina` (`YYYY-MM`) y `monto` para trazabilidad por periodo.
- Se agrego `bono_desempeno` como novedad aprobable; el motor de nomina suma su monto a `total_ingresos`, base IESS, decimos y provisiones.
- Los lotes de novedades, la carga manual, la API externa, atrasos automaticos y cron de faltas registran periodo explicito.
- El cierre de nomina descuenta beneficios de forma idempotente por periodo y guarda `metadata.descuentosNomina`.
- Los reportes internos exportan Excel, PDF resumen y CSV por persona/estructura, con columna de bonos.
- Landing/PWA se ajustaron para ingreso visible, sin textos de demo/ficticio ni metricas inventadas, y con PNG 192/512 incluidos.
- PostgreSQL local recibio la migracion `20260618133000_dvn26_bonus_novelty_amount`.

Validaciones ejecutadas:

- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS, migracion DVN26 aplicada en `plan_haiky`.
- `npx.cmd prisma generate`: PASS.
- `node --check` en servicios/controladores tocados: PASS.
- `npm.cmd test -- --runInBand`: PASS, 19 suites, 74 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- `npm.cmd run doctor` en `app-movil`: PASS, Expo Doctor 21/21.
- `npm.cmd run check:stores` en `app-movil`: PASS.

## Gobierno legal

- E-01 no puede aplicarse como valor productivo hasta confirmar con contador/planilla IESS vigente si el aporte personal debe ser 9.45% o 9.95% por tipo de contrato y empleador. El runtime mantiene el bloqueo profesional y no cambia ese valor sin validacion externa.
- Si el valor no esta confirmado, el runtime debe exponer bloqueo profesional claro y no prometer cumplimiento total.
- Todo parametro legal debe tener vigencia, fuente, responsable, fecha de validacion y estado: `pendiente_validacion`, `validado_oficial`, `bloqueado`.

## Criterios de cierre

- Ningun calculo oficial debe depender de constantes aisladas en frontend o mobile.
- Toda funcion backend que afecte operacion debe tener pantalla o acceso visible cuando corresponda.
- Toda exportacion debe respetar tenant, periodo, estructura organizativa y permisos.
- PWA y app movil no deben cachear datos personales de nomina.
- Todo flujo debe cumplir `RULES.md`: UTF-8 sin BOM, cero fallos silenciosos, errores con `code`, `statusCode`, `correlationId`, `userId` si existe, y exposicion frontend obligatoria.

## Referencias de scripts

| Script | Uso en DVN26 | Nota |
|--------|--------------|------|
| `07_fix_nomina_calculos.js` | DVN26-02, DVN26-04 | No aplicar literal; adaptar a servicios backend y pruebas existentes. |
| `08_backend_acta_finiquito_contrato.js` | DVN26-03 | Reescribir para Express/pdfmake/doc service; no usar Base44 ni Deno. |
| `09_backend_contrato_trabajo.js` | DVN26-03 | Usar como checklist de clausulas, no como implementacion. |
| `10_pwa_landing.js` | DVN26-08 | Contrastar con PWA existente; evitar service worker que cachee API. |
| `11_fix_multitenant_reportes_planes.js` | DVN26-06, DVN26-07 | Adaptar a tenantId/RBAC/capability service real. |

## Entregables DVN26-00

- Este plan maestro.
- `docs2/diagnostico-v2-nomina-ec-2026/MATRIZ_DVN26_HALLAZGOS.md`.
- `docs2/diagnostico-v2-nomina-ec-2026/REPORTE_DVN26_00_BASELINE.md`.
- `docs2/diagnostico-v2-nomina-ec-2026/REPORTE_DVN26_09_CIERRE_RUNTIME.md`.
- Prompts `.github/prompts/DIAGNOSTICO-V2-NOMINA-EC-2026-00..09-*.md`.
- Actualizacion de `CODEX_CONTEXT.md`.
- Actualizacion firmada de `.vscode/AuditLock.json`.

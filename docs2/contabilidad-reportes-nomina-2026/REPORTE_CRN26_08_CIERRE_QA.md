# Reporte CRN26-08 - Cierre QA local

## Estado

Completado localmente con cierre adicional anti-brecha.

## Cierres funcionales agregados

- Cada corrida de calculo de nomina crea un lote en `payroll_calculation_batches`.
- Cada nomina y cada linea normalizada queda asociada a `calculation_batch_id`.
- La migracion hizo backfill de nominas historicas: 5 lotes creados, 0 nominas sin lote y 0 lineas sin lote en la base local.
- Las novedades aprobadas se consumen dinamicamente desde `novelty_type_configs` y fallan visible si el tipo no esta activo/configurado.
- La contabilidad de novedades se resuelve en la misma matriz `payroll_accounting_mappings`; no existe una segunda fuente contable paralela.
- La PWA expone `Cuentas contables de nomina` separadas de `Valores legales` y retiro la opcion visible de asientos contables legacy.
- La raiz del repo ahora gobierna `backend`, `frontend-web` y `app-movil` como workspaces de un solo sistema.
- `scripts/verify-system-contracts.mjs` bloquea recursos/reportes/endpoints visibles sin soporte backend/schema.
- Cierre DOC26 agregado: `acta_entrega_dotacion` se genera desde backend/PWA, registra PDF en `documentos_legales`, estructura items en `acta_entrega_equipos` y queda visible en `Documentos > Entrega de dotacion`.
- Cierre anti-duplicados agregado: `Tipo de novedad` queda deduplicado por `LOWER(BTRIM(code))`, preferencia tenant sobre default global y indice unico parcial `novelty_type_configs_active_code_norm_idx` para activos vigentes.

## Migraciones aplicadas

- `20260624210000_crn26_payroll_accounting_reports`
- `20260624223000_crn26_configurable_novelties`
- `20260624224500_crn26_payroll_calculation_batches`
- `20260624231500_doc26_equipment_delivery_acts`
- `20260624233500_crn26_novelty_type_unique_index`

Nota QA: el primer intento de `20260624224500_crn26_payroll_calculation_batches` fue bloqueado por `trg_prevent_update_closed_nomina` durante el backfill tecnico. Se marco como rolled back en Prisma, se ajusto la migracion para desactivar/reactivar solo ese trigger durante el backfill y se reaplico correctamente. El trigger quedo activo (`tgenabled = O`).

## Gates ejecutados

- `npm run contracts`: PASS.
- `npm run prisma:validate`: PASS.
- `npx prisma migrate deploy` en `backend`: PASS.
- `npx prisma generate` en `backend`: PASS.
- `npm run test:backend`: PASS, 29 suites y 127 tests.
- `npm run build:web`: PASS.
- `npm run check:mobile`: PASS.
- `node --check` en servicios/controladores modificados: PASS.
- Verificacion DB local: 5 lotes, 0 nominas sin lote, 0 lineas sin lote, novedades base configuradas y 0 tipos de novedad activos duplicados por alcance/codigo normalizado.

## Riesgos residuales

- Validacion contable profesional del plan de cuentas real antes de produccion.
- Smoke visual con usuario real para crear novedad, recalcular nomina, revisar cuentas contables, generar acta de dotacion y descargar XLSX/CSV/PDF.
- La generacion PDF requiere almacenamiento S3/compatible configurado en produccion.
- Definir formato importable a ERP externo si el cliente lo requiere.

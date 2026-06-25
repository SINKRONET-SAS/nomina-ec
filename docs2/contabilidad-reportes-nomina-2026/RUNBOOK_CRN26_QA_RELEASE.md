# Runbook CRN26 - QA y release

## Preparacion

1. Confirmar `AuditLock.json` de la fase anterior firmado.
2. Revisar `RULES.md`.
3. Confirmar que no hay cambios no relacionados en el worktree.
4. Usar tenant demo con empleados, beneficios aprobados, novedades y nomina calculada.

## Gates tecnicos

- `npx.cmd prisma validate` en `backend`.
- `npx.cmd prisma migrate deploy` cuando existan migraciones CRN26.
- `npm.cmd test -- payrollReportService.test.js calculoNominaService.test.js --runInBand`.
- Tests nuevos de:
  - mapping contable vigente;
  - bloqueo por mapping faltante;
  - lineas de calculo normalizadas;
  - matriz empleados x beneficios;
  - asientos balanceados.
- `npm.cmd run build` en `frontend-web`.

## Smoke funcional

1. Crear o validar mapeo contable para conceptos obligatorios.
2. Calcular nomina del periodo demo.
3. Exportar detalle por empleado.
4. Exportar matriz empleados x beneficios.
5. Exportar reporte contable.
6. Verificar que total ingresos, deducciones, provisiones y neto coinciden entre reportes.
7. Verificar que debe y haber balancean.
8. Quitar temporalmente un mapping requerido y confirmar bloqueo visible.

## Evidencia requerida

- Captura o log de PWA con esquema contable visible.
- Archivo XLSX/CSV de detalle por empleado.
- Archivo XLSX/CSV de matriz beneficios.
- Archivo XLSX/CSV de asientos contables.
- Registro de auditoria de exportacion con filtros y correlationId.
- AuditLock actualizado por fase.

## Rollback

- Si falla migracion: aplicar script documentado de rollback de tablas CRN26 sin tocar `nominas` historicas.
- Si falla reporte: desactivar perfiles CRN26 y mantener reportes existentes.
- Si falla PWA: ocultar navegacion CRN26 por feature flag sin eliminar backend.

## Criterio de cierre

CRN26 solo cierra cuando los reportes operativos y contables son visibles en PWA, exportables, auditados, balanceados y trazables a los calculos de nomina.

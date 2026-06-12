# Fase 29 - Parámetros legales versionados

Ejecutar solo con aprobación explícita.

## Contexto obligatorio

- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Confirmar fase 28 firmada.
- Revisar `docs2/PLAN_HAIKY_RIESGOS_RESIDUALES.md`.

## Objetivo

Mover los parámetros legales críticos a base de datos con vigencia, fuente oficial, estado de validación y aprobación profesional.

## Alcance

- Parametrizar SBU, IR, IESS, décimos, vacaciones, horas extra, liquidación y redondeos.
- Guardar fuente, URL, fecha, responsable y evidencia.
- Bloquear cálculos productivos con parámetros en estado no aprobado.
- Crear UI de revisión legal para SUPERADMIN.
- Mantener compatibilidad con servicios existentes.

## Validaciones

- Tests de cálculo con parámetros aprobados y bloqueados.
- Tests de redondeo por rubro.
- `npx prisma validate`.
- `npm test -- --runInBand` en backend.
- AuditLock firmado.

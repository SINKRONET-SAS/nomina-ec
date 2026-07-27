# RFI26-00 - Diagnostico y gobierno

- **Plan**: `HAIKY-RDEP-F107-IESS-CUMPLIMIENTO-2026`
- **Codigo fase**: `RFI26-00`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `BAI26` firmado

## Objetivo

Diagnostico de cumplimiento RDEP, Formulario 107 y IESS Batch contra estandares SRI/IESS Ecuador 2026.

## Entregables

1. Plan Haiky en `docs2/PLAN_HAIKY_RDEP_F107_IESS_CUMPLIMIENTO_2026.md`
2. Prompts por fase en `.github/prompts/RFI26-*`
3. Actualizacion de `.github/CODEX_CONTEXT.md`
4. AuditLock encadenado en `.vscode/AuditLock.json`

## Hallazgos clave

- **10 hallazgos**: 5 altos, 4 medios, 1 bajo
- **RDEP**: ingresos no desagregados (suelSal vs sobSuelComRemu), estab hardcoded
- **F107**: faltan decimos y fondo de reserva en resumen anual
- **IESS**: solo MSU, faltan ENT/SAL, sueldo incluye ingresos no-IESS

# RFI26-04 - QA, regresion y cierre

- **Plan**: `HAIKY-RDEP-F107-IESS-CUMPLIMIENTO-2026`
- **Codigo fase**: `RFI26-04`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `RFI26-03` firmado

## Objetivo

Validacion integral de las correcciones RDEP, F107 e IESS, tests de regresion y cierre del plan.

## Tareas

### RFI26-04-T1: Validacion sintactica

- `node --check` en archivos modificados (sriRdepGenerator.js, sriFormulario107Service.js, iessSaeGenerator.js)
- `npx prisma validate` PASS

### RFI26-04-T2: Tests unitarios

- Suite RDEP: generacion, desagregacion, validacion XSD
- Suite F107: generacion, buildSummary con decimos y FR
- Suite IESS: MSU con sueldo correcto, ENT, SAL, precheck multi-tipo
- Suite completa backend: todas las suites PASS

### RFI26-04-T3: Gates de calidad

- `git diff --check` sin whitespace errors
- Manifiestos actualizados con tipos soportados
- Backward compatibility: tests existentes sin modificacion siguen pasando

### RFI26-04-T4: AuditLock cierre

- Actualizar AuditLock con RFI26-04 completed-pass
- Firmar con SHA256 del lock anterior
- CODEX_CONTEXT actualizado con estado final

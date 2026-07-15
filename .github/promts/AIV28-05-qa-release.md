# AIV28-05 - Gobierno y QA release

## Plan
HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

## Objetivo
Cerrar el plan AIV28 con gobierno Haiky: CODEX_CONTEXT, AuditLock, validaciones cruzadas y commit.

## Tareas

1. Actualizar `.github/CODEX_CONTEXT.md` con:
   - Tabla de incremento AIV28.
   - Decisiones (no migrar Python, falsos positivos, riesgos aceptados).
   - Gates ejecutados.

2. Actualizar `.vscode/AuditLock.json` con:
   - phaseCompleted: AIV28-05-qa-release
   - status: completed-pass
   - validationChecks: lista de gates
   - filesModified: archivos tocados
   - signature: SHA256 del lock anterior + timestamp
   - decisions y runtimeChanges

3. Ejecutar gates:
   - `npx jest --runInBand` (suite backend completa).
   - `npm run prisma:validate`.
   - `npm --workspace=frontend-web run build` (build PWA).
   - `npm --workspace=app-movil run check:stores` (mobile readiness).
   - Verificar UTF-8 sin BOM en archivos modificados.
   - `git diff --check`.

4. Commit con mensaje: `phase: AIV28-05 task: gobierno-qa-release`.

## Criterios de aceptacion

- Todos los gates pasan.
- AuditLock firmado.
- CODEX_CONTEXT actualizado.
- Commit limpio sin archivos sensibles.
- RULES.md: AuditLock firmado, trazabilidad, zero regresiones.

## Archivos afectados

- `.github/CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

# LRP26-04 - QA y cierre

## Objetivo
Verificar que no haya regresiones y cerrar los artefactos de gobierno.

## Tareas
1. `node --check` en todos los archivos backend modificados.
2. Ejecutar tests backend.
3. `npx prisma validate`.
4. Build PWA.
5. Verificar que ningun footer de PDF contiene "Plantilla" ni version interna.
6. Actualizar AuditLock.json con estado `completed-pass`.
7. Actualizar CODEX_CONTEXT.md con gates.
8. Commit y push a main.

## Gates
- node --check PASS.
- Tests PASS.
- Prisma validate PASS.
- PWA build PASS.
- AuditLock JSON valido.

## Reglas
- Commit con formato `phase: LRP26-04 task: logo reportes firma empresa`.

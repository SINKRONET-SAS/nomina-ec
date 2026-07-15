# NER26-00 - Baseline gobierno y plan

Objetivo: crear la base documental del plan HAIKY para corregir novedades de un empleado sin impactar calculos de otros empleados.

Instrucciones:
1. Leer `RULES.md` y `.vscode/AuditLock.json`.
2. Crear/actualizar `docs/PLAN_HAIKY_NOVEDADES_EMPLEADO_RECALCULO_SELECTIVO_2026.md`.
3. Crear prompts NER26-01..03.
4. Actualizar `.vscode/AuditLock.json` con `phaseCompleted = NER26-00`.
5. No tocar runtime en esta fase.
6. Validar JSON, UTF-8 sin BOM y `git diff --check`.

Criterio de cierre: plan, prompts y AuditLock quedan listos para aplicar despues en el repo local.

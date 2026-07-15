# NER26-03 - QA, regresion y cierre AuditLock

Objetivo: cerrar NER26 con evidencia de que la correccion de novedades por empleado no impacta calculos de otros empleados.

Instrucciones:
1. Leer `RULES.md`, AuditLock y plan NER26.
2. Ejecutar pruebas backend y frontend definidas en el plan.
3. Revisar diffs destructivos para confirmar que ningun flujo individual borra por periodo completo sin `empleado_id`.
4. Documentar reporte final bajo `docs/novedades-empleado-recalculo-selectivo-2026/`.
5. Actualizar `.vscode/AuditLock.json` con `phaseCompleted = NER26-03`, checks y firma.
6. Commit final con `phase: NER26-03 task: qa cierre recalculo selectivo`.

Gates minimos:
- Tests backend afectados.
- Build/check frontend.
- `git diff --check`.
- JSON parse de AuditLock.
- UTF-8 sin BOM.

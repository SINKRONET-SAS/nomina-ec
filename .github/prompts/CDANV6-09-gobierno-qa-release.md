# CDANV6-09 - Gobierno, QA y release

Objetivo: cerrar HAL-9 y ejecutar QA final CDANV6.

Reglas:
- Requiere aprobacion explicita.
- Diagnosticar si `docs2/` y `.vscode/AuditLock.json` estan trackeados, usados por CI o requeridos por planes activos.
- No borrar ni desindexar evidencia sin aprobacion explicita.
- Documentar decision: mantener, mover a repo privado, ignorar futuros cambios o retirar del indice.
- Ejecutar gates generales segun alcance: contracts, prisma validate, backend tests, web build, mobile check y `git diff --check`.
- Crear `REPORTE_CDANV6_09_QA_RELEASE.md`.
- Actualizar AuditLock final y commit `phase: CDANV6-09 task: qa-release`.

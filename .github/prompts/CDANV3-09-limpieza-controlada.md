# CDANV3-09 - Limpieza controlada

Objetivo: revisar candidatos de configuracion o duplicidad sin borrar funcionalidad activa.

Verificar:
- JSON de `backend/src/config` referenciados o no.
- Duplicidad de validaciones y helpers.
- Mensajes tecnicos en UI.

Reglas:
- No eliminar archivo publico sin `rg` de usos y prueba.
- Si hay duda, mover a documentacion o dejar reporte de decision.
- No mezclar limpieza con features nuevas.

Cierre:
- Reporte `REPORTE_CDANV3_09_LIMPIEZA_CONTROLADA.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-09 task: limpieza-controlada`.

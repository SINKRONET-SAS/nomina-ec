# CDANV6-04 - UI ortografia y lenguaje comercial

Objetivo: cerrar HAL-3 corrigiendo textos visibles sin tocar claves tecnicas.

Reglas:
- Requiere aprobacion explicita.
- No ejecutar `sed` global sin revisar contexto.
- Corregir solo copy visible en PWA, README o superficies comerciales.
- No cambiar rutas, ids, slugs, scopes, keys ni nombres de variables.
- Ejecutar build web.
- Crear `REPORTE_CDANV6_04_UI_ORTOGRAFIA.md`.
- Actualizar AuditLock y commit `phase: CDANV6-04 task: ui-ortografia`.

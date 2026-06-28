# CDANV6-06 - Split Parametrizacion

Objetivo: cerrar HAL-5 dividiendo `Parametrizacion.jsx` sin cambio funcional.

Reglas:
- Requiere aprobacion explicita.
- Separar helpers puros y subcomponentes de forma incremental.
- No mezclar cambios de UI funcional o API.
- Mantener imports claros y evitar duplicar logica.
- Ejecutar build web y smoke manual de Parametrizacion.
- Crear `REPORTE_CDANV6_06_PARAMETRIZACION_SPLIT.md`.
- Actualizar AuditLock y commit `phase: CDANV6-06 task: parametrizacion-split`.

# CDANV6-07 - PWA maskable icons

Objetivo: cerrar HAL-6 agregando iconos PNG maskable 192 y 512.

Reglas:
- Requiere aprobacion explicita.
- No referenciar assets inexistentes.
- Generar o validar `icon-192-maskable.png` e `icon-512-maskable.png`.
- Registrar iconos en `frontend-web/pwa.config.js` o manifest equivalente.
- Ejecutar build web y verificar manifest generado.
- Crear `REPORTE_CDANV6_07_PWA_MASKABLE.md`.
- Actualizar AuditLock y commit `phase: CDANV6-07 task: pwa-maskable`.

# HCF26-06 — QA, cierre y release

Ejecuta antes de cerrar: `node --check` en backend modificado, pruebas unitarias y contractuales de identidad/PDF/auth/cargas, `npx prisma validate`, build frontend, revisión de rutas, navegación, mensajes, UTF-8, regresiones y ausencia de cambios en `sinkroniq-mobile`.

Actualiza CODEX_CONTEXT y cierra plan/AuditLock con evidencia y firma final. Commit con `phase: HCF26-06` y `task: 6.1`, luego push a `origin/main`. No cierres con checks omitidos o fallidos sin documentar bloqueo explícito.


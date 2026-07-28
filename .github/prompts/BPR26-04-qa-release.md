# BPR26-04 — Regresión, cierre y publicación

## Autorización

Ejecutar esta fase después de BPR26-03 firmado.

## Instrucciones

1. Ejecutar suite backend completa, Prisma validate, `node --check`, build frontend y `git diff --check`.
2. Verificar que rutas mensuales, anticipos, reportes anuales y contabilidad existente no regresen.
3. Confirmar que la migración es reversible y que no existen archivos fuera del alcance.
4. Cerrar el plan y AuditLock únicamente con validaciones reales.
5. Crear commit con `phase: BPR26-04` y `task: roles de beneficios legales`, y hacer push a `main`.

## Salida obligatoria

AuditLock cerrado, plan con fases completadas y referencia al commit/push exitosos.

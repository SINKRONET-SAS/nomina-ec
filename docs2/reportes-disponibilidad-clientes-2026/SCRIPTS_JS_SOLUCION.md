# Scripts JS de solucion HRD26

- `npm run audit:reportes:2026`: regenera diagnostico JSON y Markdown.
- `npm run haiky:reportes:2026`: ejecuta diagnostico, contratos, pruebas focalizadas, Prisma, mobile check, build web y actualiza AuditLock.
- `scripts/haiky-reportes-disponibilidad-2026-diagnostic.mjs`: confirma hallazgos contra codigo y fuentes.
- `scripts/haiky-reportes-disponibilidad-2026-solution.mjs`: orquesta la solucion y genera firma de fase.

## Resultado esperado

- Backend: `PAYROLL_NOVELTY_MATRIX` disponible.
- PWA: selector Matriz de novedades del rol, alcance Global/Individual y botones Exportar mes/Acumulado anual.
- QA: contratos del sistema y pruebas focalizadas sin fallos.

# HRD26-04 Scripts y contratos

Base: `RULES.md` y fase HRD26-03 firmada.

Objetivo: generar scripts JS de diagnostico/solucion y gates de contrato.

Entregables:

- `scripts/haiky-reportes-disponibilidad-2026-diagnostic.mjs`
- `scripts/haiky-reportes-disponibilidad-2026-solution.mjs`
- `npm run audit:reportes:2026`
- `npm run haiky:reportes:2026`
- Contratos en `scripts/verify-system-contracts.mjs` para bloquear regresion de matriz, alcance y acumulado anual.

Validacion minima:

- `npm run audit:reportes:2026`
- `node scripts/verify-system-contracts.mjs`

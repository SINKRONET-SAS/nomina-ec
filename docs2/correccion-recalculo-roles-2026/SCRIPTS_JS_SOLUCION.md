# Scripts JS de solucion HRC26

- Diagnostico repetible: `node scripts/haiky-payroll-correction-2026-diagnostic.mjs`.
- Solucion y cierre: `node scripts/haiky-payroll-correction-2026-solution.mjs`.
- Contratos cruzados: `node scripts/verify-system-contracts.mjs`.
- Suite completa: `npm run haiky:roles:2026`.

El script de solucion ejecuta diagnostico, contratos, pruebas backend, Prisma, homologacion mobile, build PWA/LANDING, UTF-8 y `git diff --check`; solo firma AuditLock cuando todos los gates terminan correctamente.

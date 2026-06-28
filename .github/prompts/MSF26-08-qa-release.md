# MSF26-08 - QA, release y cierre

Objetivo: cerrar MSF26 con pruebas, evidencia, AuditLock y release gate.

Instrucciones:

- Requiere aprobacion explicita.
- Aplicar `RULES.md`.
- Ejecutar gates: contratos, prisma, tests backend, build web, check mobile, UTF-8 sin BOM y `git diff --check`.
- Ejecutar smoke de saldos iniciales con DEMO.
- Ejecutar smoke facturador solo en modo seguro, certificacion o mock firmado.
- Actualizar contexto, reportes y AuditLock final.
- Commit con `phase: MSF26-08 task: qa release`.

Salida esperada:

- `REPORTE_MSF26_08_QA_RELEASE.md`.
- AuditLock final firmado.
- Commit y push si el usuario lo solicita o si el plan de ejecucion lo requiere.

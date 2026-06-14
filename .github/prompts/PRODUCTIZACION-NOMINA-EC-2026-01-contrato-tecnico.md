# PNE26-01 - Contrato tecnico de datos y runtime

Ejecutar solo con aprobacion explicita.

Objetivo: resolver el contrato tecnico antes de agregar funcionalidad laboral.

Contexto obligatorio:
- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Confirmar que `PNE26-00` esta firmado.
- Leer `docs/PLAN_HAIKY_PRODUCTIZACION_NOMINA_EC_DOCUMENTO_NOMINA.md`.

Tareas:
- Inventariar acceso a datos `pg` directo, Prisma y migraciones existentes.
- Definir criterio canonico por modulo: Prisma, `pg` directo justificado o adaptador transicional.
- Documentar endpoints publicos y compatibilidad.
- Eliminar o corregir fallos silenciosos encontrados dentro del alcance.
- Definir estrategia multi-tenant y rollback para futuras migraciones.

Validaciones:
- `npx prisma validate`.
- `node --check` en archivos backend modificados.
- Tests focalizados si se toca runtime.
- Reporte `docs/REPORTE_PNE26_01_CONTRATO_TECNICO.md`.
- AuditLock firmado.

No hacer:
- No introducir nuevas tablas laborales definitivas sin contrato aprobado.
- No cambiar respuestas publicas sin plan de compatibilidad.

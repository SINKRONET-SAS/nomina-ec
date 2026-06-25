# CRN26-02 - Modelo de datos y conceptos

Actua bajo `RULES.md`.

Objetivo: disenar e implementar el modelo de conceptos reportables y contables con vigencia, RLS, indices y rollback.

Tareas:

- Crear catalogo canonico de conceptos de nomina y categorias.
- Crear tablas de mapping contable por tenant y vigencia.
- Crear tablas de snapshots de lineas de calculo si el diagnostico lo aprueba.
- Agregar indices por tenant, periodo, empleado, concepto y centro de costo.
- Documentar rollback.

Cierre:

- Migracion Prisma validada.
- `npx.cmd prisma validate` PASS.
- Reporte `REPORTE_CRN26_02_MODELO_DATOS.md`.
- AuditLock firmado.
- Commit esperado: `phase: CRN26-02 task: modelo conceptos contables`.

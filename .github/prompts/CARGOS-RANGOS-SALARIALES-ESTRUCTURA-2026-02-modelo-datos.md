# CRS26-02 - Modelo de datos y migracion

Actua bajo `RULES.md`.

Objetivo: disenar e implementar el modelo de cargos con rango salarial y relacion a estructura organizativa.

Tareas:

- Validar AuditLock CRS26-01.
- Definir tabla de cargos/puestos con tenant, unidad organizativa, codigo, nombre, rango salarial, moneda, vigencia, estado y metadata.
- Agregar relacion en empleados conservando compatibilidad con `empleados.cargo`.
- Crear indices por tenant, codigo, unidad, estado y vigencia.
- Definir reglas para rango salarial fuera de politica y cargos inactivos.
- Crear migracion reversible documentada.

Cierre:

- Prisma valida.
- Migracion aplica localmente.
- Reporte CRS26-02 con estrategia de compatibilidad y rollback.
- Commit esperado: `phase: CRS26-02 task: modelo cargos rangos`.

# Fase 25 - Planes y suscripciones Nómina-Ec

Actua bajo `RULES.md`.

Objetivo: crear gestion de planes y suscripciones por tenant para Nómina-Ec.

Tareas:

- Validar AuditLock de fase 24.
- Crear catalogo inicial de planes: TRIAL, MICRO, PYME, EMPRESA, CORPORATIVO.
- Definir limites por empleados, empresas, usuarios, documentos, reportes, archivos bancarios y soporte.
- Crear endpoints publicos y administrativos de planes.
- Agregar RBAC: `planes:ver`, `planes:gestionar`, `pago:iniciar`, `suscripcion:cancelar`.
- Implementar estado de suscripcion por tenant y bloqueo operativo reversible.

Cierre:

- Tests de permisos SUPERADMIN/OWNER.
- Tests de limites por plan.
- Migraciones Prisma validadas.
- AuditLock firmado para fase 25.

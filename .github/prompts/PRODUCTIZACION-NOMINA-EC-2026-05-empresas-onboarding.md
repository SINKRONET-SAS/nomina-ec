# PNE26-05 - Empresas y onboarding OWNER

Ejecutar solo con aprobacion explicita.

Objetivo: crear el flujo productivo de empresa, tenant y primer owner.

Tareas:
- Implementar o ajustar CRUD de empresas con RUC, razon social, nombre comercial, region, ubicacion y perimetro.
- Crear onboarding que invite o cree el primer OWNER.
- Validar RUC ecuatoriano y unicidad por tenant.
- Auditar alta, bloqueo y reactivacion.

Validaciones:
- Tests de empresa y onboarding.
- Build frontend si aplica.
- Reporte `docs/REPORTE_PNE26_05_EMPRESAS_ONBOARDING.md`.
- AuditLock firmado.

No hacer:
- No crear empresas sin owner responsable.

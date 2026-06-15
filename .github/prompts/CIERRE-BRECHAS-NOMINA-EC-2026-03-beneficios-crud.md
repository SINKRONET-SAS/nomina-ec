# CBN26-03 - Beneficios CRUD real

Actua bajo `RULES.md`.

Objetivo: hacer que `Beneficios.jsx` permita edicion real de beneficios, prestamos y anticipos, con estados contables trazables.

Tareas:
- Mapear entidad `BeneficioEmpleado` o equivalente real.
- Implementar crear, editar, validar y listar con permisos.
- Definir estados: pendiente, aprobado, descontado, anulado o los equivalentes existentes.
- Registrar auditoria y errores estructurados.
- Crear `docs/REPORTE_CBN26_03_BENEFICIOS_CRUD.md`.

Validaciones:
- Build frontend.
- Tests o smoke CRUD.
- Verificar que no se descuente automaticamente en nomina hasta CBN26-05.

No hacer:
- No integrar deducciones al motor de nomina en esta fase.

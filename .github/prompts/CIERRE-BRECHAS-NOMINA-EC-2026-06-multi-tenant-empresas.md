# CBN26-06 - Empresas y multi-tenant real

Actua bajo `RULES.md`.

Objetivo: eliminar el comportamiento decorativo de `Empresas.jsx` y el uso de `empresas[0]` como empresa implicita.

Tareas:
- Mapear flujo de tenant activo y empresa activa.
- Implementar seleccion segura de empresa/tenant segun rol.
- Bloquear creacion de empleados sin empresa valida.
- Validar aislamiento tenant A/B.
- Crear `docs/REPORTE_CBN26_06_MULTI_TENANT_EMPRESAS.md`.

Validaciones:
- Tests backend o smoke multi-tenant.
- Build frontend.
- Confirmar que no queda fallback `empresas[0]` para operaciones criticas.

No hacer:
- No cambiar planes/capacidades en esta fase.

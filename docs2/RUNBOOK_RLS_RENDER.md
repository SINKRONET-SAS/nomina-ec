# Runbook RLS Render con usuario no superusuario

Estado: script preparado; evidencia Render pendiente por falta de credenciales de staging en este entorno.

## Objetivo

Comprobar en PostgreSQL Render que un usuario no superusuario respeta las politicas RLS y no puede leer ni modificar datos de otro tenant.

## Variables requeridas

- `RLS_DATABASE_URL`: URL PostgreSQL Render del usuario de aplicacion no superusuario.
- `DB_SSL=true`: requerido para Render.
- `RLS_TENANT_A`: UUID de tenant de staging A.
- `RLS_TENANT_B`: UUID de tenant de staging B.
- `RLS_EMPLOYEE_A`: UUID de empleado perteneciente al tenant A.

No registrar credenciales ni imprimir URLs completas en consola.

## Comando

```powershell
$env:RLS_DATABASE_URL="postgresql://usuario_no_superusuario:***@host/render_db"
$env:DB_SSL="true"
$env:RLS_TENANT_A="00000000-0000-0000-0000-000000000001"
$env:RLS_TENANT_B="00000000-0000-0000-0000-000000000002"
$env:RLS_EMPLOYEE_A="00000000-0000-0000-0000-000000000101"
npm --prefix backend run verify:rls:render
```

## Resultado esperado

- El script confirma que `current_user` no es superusuario.
- Con `app.current_tenant_id = RLS_TENANT_A`, el empleado A es visible.
- Con `app.current_tenant_id = RLS_TENANT_B`, el empleado A no es visible.
- Un intento de insertar nomina cruzada para tenant A bajo contexto tenant B falla o no queda permitido.

## Evidencia permitida

Registrar solo:

- Fecha y hora de ejecucion.
- Usuario de base sin host ni password.
- Hash del script ejecutado.
- Resultado booleano por prueba.
- Mensaje de error sin secretos si la politica bloquea escritura cruzada.

## Rollback operativo

Si una politica RLS bloquea operaciones legitimas:

1. Pausar despliegue de API y worker.
2. Confirmar que el backend establece `app.current_tenant_id` antes de consultar tablas tenant.
3. Revisar politicas de la migracion `20260612011000_rls_seed_hardening`.
4. Aplicar migracion correctiva; no desactivar RLS en produccion sin aprobacion OWNER.

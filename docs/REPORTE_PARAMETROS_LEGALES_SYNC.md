# Parametros legales automaticos por tenant

## Diagnostico

La parametrizacion legal ya existe como `legal_parameter_versions`, pero la carga obligatoria anterior generaba registros desde el fallback local por cada tenant. En produccion esto obliga a parametrizar manualmente reformas legales, SBU, aportes y tabla de impuesto a la renta en bases crudas, aumentando el riesgo operativo.

## Solucion propuesta e implementada

1. El SUPERADMIN mantiene la fuente global publicando parametros con `tenant_id = NULL` para el anio fiscal.
2. Cada owner puede consumir esa fuente global desde su entorno mediante el endpoint `POST /api/configuracion/parametros-legales/sincronizar-globales`.
3. Operaciones puede sincronizar todos los tenants activos con el script `npm run legal:sync -- --year=2026 --all-tenants` desde el workspace backend.
4. El proceso es idempotente: inserta o actualiza el parametro activo del tenant para la llave legal vigente y conserva trazabilidad en auditoria.
5. La tabla de impuesto a la renta viaja como JSON versionado igual que SBU, IESS, jornada, vacaciones, decimos y fondo de reserva.

## Flujo operativo recomendado

```bash
cd backend
npm run legal:sync -- --year=2026 --all-tenants
```

Para un solo tenant:

```bash
cd backend
npm run legal:sync -- --year=2026 --tenant-id=<UUID_DEL_TENANT>
```

## Controles

- Si no existen parametros globales publicados para el anio, la sincronizacion falla con `LEGAL_PARAMETERS_GLOBAL_SOURCE_EMPTY`.
- Si el owner ejecuta la sincronizacion, solo se actualiza su tenant.
- Si SUPERADMIN ejecuta `allTenants`, solo se consideran tenants activos.
- Cada ejecucion registra auditoria con accion `configuracion.sincronizar_parametros_legales_globales`.

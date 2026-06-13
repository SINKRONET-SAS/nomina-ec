# HNBE26-07 - Planes, perfiles y permisos

Fecha: 2026-06-12

## Estado actual

`CommercialPlan` ya cubre empleados maximos, empresas maximas, usuarios maximos, archivos bancarios, reportes avanzados, soporte, estado y metadatos. Las rutas usan roles `superadmin`, `owner`, `admin_rrhh`, `supervisor` y `empleado`.

## Decision

No se crea catalogo paralelo. Las capacidades laborales deben extender `CommercialPlan.metadata` o columnas versionadas del mismo dominio comercial.

## Capacidades laborales requeridas

- `max_empleados`.
- `asistencia_mobile`.
- `geocerca_avanzada`.
- `documentos_laborales`.
- `reportes_avanzados_laborales`.
- `archivos_bancarios`.
- `api_laboral`.
- `autoservicio_empleado`.

## Riesgos

- Downgrade con exceso de empleados.
- Usuario `empleado` accediendo a documentos de terceros.
- Permisos RRHH mezclados con permisos de administracion comercial.


# Fase 31 - Estructura organizativa y centros de costo

Ejecutar solo con aprobación explícita.

## Contexto obligatorio

- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Confirmar fase 30 firmada.

## Objetivo

Modelar la organización real de cada tenant con empresas, sedes, áreas, cargos, equipos, jerarquías y centros de costo.

## Alcance

- Crear catálogos de empresa, sucursal, sede, departamento, área, equipo, cargo y centro de costo.
- Agregar asignación histórica de empleados.
- Definir responsables de aprobación por estructura.
- Integrar reportes por centro de costo.
- Evitar modificar periodos cerrados por cambios futuros.

## Validaciones

- Tests de vigencia histórica.
- Tests de permisos OWNER/ADMIN_RRHH.
- Build frontend.
- AuditLock firmado.

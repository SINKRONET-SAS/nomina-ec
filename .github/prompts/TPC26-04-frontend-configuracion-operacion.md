# TPC26-04 - Frontend de configuración y operación

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Precondición y aprobación

- Validar AuditLock firmado para `TPC26-03`.
- Requerir aprobación explícita del usuario antes de modificar pantallas o navegación.

## Objetivo

Exponer al cliente la selección, parametrización y estado de sus plantillas sin duplicar el catálogo del backend.

## Tareas

- Crear sección de configuración para listar plantillas activas, estado, versión, default y revisión requerida.
- Permitir activar/desactivar/ordenar solo con permisos autorizados y confirmación clara.
- Hacer que `NuevoEmpleado.jsx` consuma únicamente opciones activas y trate claves históricas retiradas con advertencia accionable.
- Ajustar `ContratosGenerados.jsx` para mostrar plantilla, versión, estado histórico y descarga.
- Implementar estados de carga, vacío, error, bloqueo legal y siguiente acción.
- Evitar que una plantilla inactiva se use en una nueva generación desde la PWA.

## Cierre

- Build PWA, navegación y pruebas de componentes pasan.
- El avance queda visible en frontend conforme a `RULES.md`.
- AuditLock firmado antes de TPC26-05.
- Commit esperado: `phase: TPC26-04 task: frontend-configuracion-operacion`.

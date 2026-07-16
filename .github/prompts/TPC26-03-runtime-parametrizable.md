# TPC26-03 - Runtime parametrizable y versionado

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Precondición y aprobación

- Validar AuditLock firmado para `TPC26-02`.
- No tocar el generador hasta contar con aprobación explícita del usuario.

## Objetivo

Resolver únicamente plantillas activas y parametrizadas, con versiones inmutables, validación estricta y snapshot legal por documento.

## Tareas

- Extraer un resolver único de plantilla activa, default y aliases.
- Validar lista blanca de variables, tipos, requeridos, rangos y condiciones.
- Mantener la carga de JSON/definición compartida sin copiarla por tenant.
- Rechazar plantillas inactivas o versiones retiradas para nuevas generaciones.
- Congelar en metadata `templateKey`, versión, fuente, parámetros, tenant, empleado y `correlationId`.
- Mantener la descarga de documentos históricos sin depender de que la plantilla siga activa.
- Cubrir generación automática, generación manual, alias heredado, errores y aislamiento tenant.

## Cierre

- Tests backend focalizados y contratos de API pasan.
- No debe existir segunda lógica de resolución en frontend.
- AuditLock firmado antes de TPC26-04.
- Commit esperado: `phase: TPC26-03 task: runtime-parametrizable`.

# TPC26-01 - Diagnóstico y decisión de arquitectura

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Precondición y aprobación

- Verificar que `.vscode/AuditLock.json` tenga `phaseCompleted: TPC26-00` y firma válida.
- No iniciar esta fase sin aprobación explícita del usuario en respuesta a este prompt.

## Objetivo

Medir el estado real de fuentes, activaciones, documentos emitidos, tamaños y consumidores para decidir la arquitectura final sin crear catálogos paralelos.

## Tareas

- Inventariar las 17 definiciones, secciones, variables, aliases, versiones y tipos contractuales.
- Identificar empleados por `tipo_contrato`, plantillas usadas en metadata y PDFs históricos por tenant.
- Medir tamaño de fuentes, PDFs, duplicados y objetos no referenciados en cada backend de almacenamiento disponible.
- Comparar reutilizar `configuration_catalogs` con una ampliación específica, considerando tenant, aprobación, estado, versionado e índices.
- Definir el contrato compatible para listar, activar, seleccionar, generar y descargar documentos históricos.
- Definir si la generación automática continúa limitada a la plantilla predeterminada o pasa a demanda.

## Salida

- Diagnóstico Markdown/JSON con hallazgos confirmados.
- Decisión arquitectónica justificada.
- Matriz de compatibilidad y dependencias.
- Lista de archivos que podrán modificarse en fases posteriores.
- AuditLock actualizado y firmado.

## Cierre

- No cerrar con falsos positivos ni con promesas de ahorro sin medición.
- Commit esperado: `phase: TPC26-01 task: diagnostico-arquitectura`.

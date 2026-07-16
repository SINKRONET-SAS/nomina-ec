# TPC26-05 - Migración y optimización de almacenamiento

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Precondición y aprobación

- Validar AuditLock firmado para `TPC26-04`.
- No borrar ni mover objetos sin aprobación explícita, inventario y `dry-run` aprobado.

## Objetivo

Reducir almacenamiento no necesario sin afectar contratos emitidos, firmados o sujetos a retención legal.

## Tareas

- Medir fuentes compartidas, PDFs generados, duplicados y objetos huérfanos por tenant.
- Separar documentos de evidencia, temporales, pruebas y fuentes comunes.
- Definir retención, objeto legal, referencia documental y criterio de eliminación.
- Ejecutar limpieza reversible solo sobre objetos demostrablemente descartables.
- Documentar antes/después, ahorro, objetos excluidos y procedimiento de restauración.
- Verificar que desactivar una plantilla no impide descargar contratos históricos.

## Cierre

- Reporte de medición y script de limpieza con `dry-run`.
- Ningún documento legal eliminado.
- AuditLock firmado antes de TPC26-06.
- Commit esperado: `phase: TPC26-05 task: storage-migracion-retencion`.

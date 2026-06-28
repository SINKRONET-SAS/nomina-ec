# REPORTE APK26-07 - Politica repo publico

## Decision

`docs2/` y `.vscode/AuditLock.json` se mantienen porque son trazabilidad activa de planes Haiky. No se borran
ni se retiran del repo sin aprobacion explicita de gobierno.

## Cambio

`.gitignore` ahora ignora futuros anexos locales/privados y binarios sensibles dentro de `docs2`, incluyendo
PDF, XLS/XLSX, ZIP e imagenes.

## Evidencia

- `git ls-files docs2` muestra artefactos documentales versionados.
- No se encontraron binarios tracked en `docs2` al momento del cierre APK26.


# POLITICA CDANV6 - ARTEFACTOS PUBLICOS Y TRAZABILIDAD

## Decision

CDANV6 mantiene `docs2/` y `.vscode/AuditLock.json` versionados mientras los planes Haiky activos dependan de esos artefactos para trazabilidad, control de fases y evidencia de cierre.

## Regla de publicacion

- Solo se versionan artefactos sanitizados, sin secretos, tokens, URL privadas, usuarios reales, credenciales, datos personales o archivos descargados con informacion sensible.
- `docs2/` se usa para planes, matrices, reportes y runbooks aprobados.
- `.vscode/AuditLock.json` se usa como bitacora firmada de ejecucion y no debe contener secretos.
- Los anexos locales o privados deben quedar fuera del repositorio mediante `.gitignore`.

## Exclusiones locales

Se ignoran:

- `docs2/private/`
- `docs2/_local/`
- `.vscode/AuditLock.local.json`
- `*.local.auditlock.json`

## Criterio de cambio futuro

Si la organizacion decide mover la gobernanza Haiky a un repositorio privado, primero se debe crear una migracion documental con inventario, hash de cierre y aprobacion explicita. Hasta entonces, no se eliminan `docs2/` ni `.vscode/AuditLock.json` por HAL-9.

# Reporte DIC26-01 - Diagnostico integral

## Comandos de auditoria

- `git status --short`
- `rg` de rutas, imports, logs, TODO/FIXME/HACK, permisos moviles y dependencias.
- Lectura de `RULES.md`, `CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.
- Gate Node de UTF-8, BOM y mojibake literal.

## Hallazgos ejecutables

- La oferta comercial existia como ruta de precios, pero no estaba resumida como bloque visible dentro del primer recorrido de landing.
- Login, registro y recuperacion web no permitian visualizar la clave digitada.
- La app movil tenia pantallas de historial y perfil, pero no estaban accesibles desde `App.js`.
- La app declaraba permiso de camara y dependencia `expo-camera` sin flujo de captura real.
- Dependencias de React Navigation estaban instaladas pero no se usaban.
- Habia BOM heredado en archivos runtime y ejemplos literales de mojibake en reportes antiguos.
- La app movil tenia dos puntos sensibles a timezone del dispositivo: historial y periodo de autoservicio.

## Falso positivo aclarado

PowerShell puede imprimir acentos como mojibake aunque los bytes del archivo esten correctos. Por eso el gate definitivo se ejecuta con Node leyendo UTF-8 y revisando bytes.

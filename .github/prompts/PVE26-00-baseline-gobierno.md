# PVE26-00 — Gobierno y baseline

Actúa sobre `C:\proyectos web\nuevo_nomina` y lee `RULES.md` antes de modificar archivos.

## Objetivo

Confirmar el alcance de versionamiento visible de `legal_parameter_versions` para la República del Ecuador, sin crear una ruta frontend paralela.

## Tareas

1. Inspeccionar el flujo actual de `configurationService`, controlador, rutas, API web y `Parametrizacion.jsx`.
2. Confirmar que la edición actual sobrescribe la fila activa y que el resumen solo expone vigentes.
3. Registrar baseline de suites backend, validación Prisma, parseo frontend y estado Git.
4. Crear o actualizar los artefactos de gobierno y firmar `PVE26-00` en AuditLock.

## Salida y puerta de fase

No implementar todavía el comportamiento final. Entregar hallazgo confirmado, archivos afectados, baseline reproducible y firma de fase. No avanzar a `PVE26-01` si el baseline no está registrado.

# DCEN26-01 - Diagnostico runtime demo

Actua bajo `RULES.md`.

Objetivo: diagnosticar el runtime actual antes de crear seeds o datos demo.

Tareas:

- Validar AuditLock DCEN26-00.
- Revisar modelos, migraciones, servicios, seeds, rutas, factories y pantallas existentes.
- Detectar datos demo previos, riesgos de duplicidad, reset inseguro o dependencia de datos reales.
- Proponer estrategia idempotente y reversible.

Cierre:

- Reporte DCEN26-01 con hallazgos y decision de implementacion.
- No tocar datos ni crear tenant demo en esta fase.
- Commit esperado: `phase: DCEN26-01 task: diagnostico runtime demo`.

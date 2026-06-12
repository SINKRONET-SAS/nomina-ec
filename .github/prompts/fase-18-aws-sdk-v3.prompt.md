# Fase 18 - Migracion AWS SDK v3

Actua bajo `RULES.md`.

Objetivo: migrar S3 desde `aws-sdk` v2 a AWS SDK v3 modular.

Tareas:

- Validar AuditLock de fase 17 antes de tocar runtime.
- Instalar dependencias v3 necesarias para S3 y URLs firmadas.
- Reemplazar `require('aws-sdk')` en `backend/src/config/s3.js`.
- Mantener compatibilidad de funciones exportadas.
- Agregar logs y errores visibles en espanol.
- Agregar pruebas unitarias con mocks de S3.
- Eliminar dependencia `aws-sdk` v2 si no quedan usos.

Cierre:

- No quedan usos runtime de `aws-sdk` v2.
- Tests relacionados pasan.
- AuditLock firmado para fase 18.


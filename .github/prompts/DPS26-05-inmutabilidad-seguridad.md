# DPS26-05 inmutabilidad, auditoria y seguridad

Objetivo: validar invariantes tecnicas de seguridad, tenant e inmutabilidad.

Requiere aprobacion explicita del usuario.

Tareas:
- Revisar RLS, migraciones, queries tenant-aware y middleware.
- Validar JWT, claims, expiracion y revocacion cuando aplique.
- Validar cifrado de cuentas bancarias y documentos privados con URL firmada.
- Probar que marcaciones y nominas cerradas no se editen ni borren indebidamente.
- Revisar logs sin PII y con correlationId.

Gates:
- Tests backend.
- `npm.cmd run prisma:validate`
- Reporte de fase y `AuditLock.json` firmado.

# Matriz CES26 - Email SMTP, privacidad y cumplimiento

| ID | Severidad | Hallazgo | Evidencia | Accion ejecutada |
|----|-----------|----------|-----------|------------------|
| CES-H01 | Alta | CSW26 enviaba emails, pero no persistia evidencia legal minima de envio | `communicationService` devolvia `delivery`, pero no habia tabla de eventos | Crear `communication_events` con hash, retencion, indices y RLS. |
| CES-H02 | Alta | La auditoria no distinguia finalidad: verificacion, recuperacion o invitacion laboral | Eventos SMTP/WhatsApp no existian como fuente consultable | Etiquetar `purpose` y `flow` por cada envio transaccional. |
| CES-H03 | Alta | Riesgo LOPDP si se guardaban destinatarios o codigos en logs/tablas | Codigos se usan en email y reset; destinatario es dato personal | Guardar solo hash HMAC, dominio/pista no sensible y metadata permitida. |
| CES-H04 | Media | Pantalla Comunicaciones mostraba estado de canal, no evidencia historica | `Comunicaciones.jsx` no tenia historial de eventos | Agregar endpoint `/api/comunicaciones/eventos` y tabla visual reciente. |
| CES-H05 | Media | Retencion de evidencias no estaba parametrizada | No existia variable de retencion | Agregar `COMMUNICATION_RETENTION_DAYS=365`. |
| CES-H06 | Media | Secreto de hash de auditoria no estaba documentado | Hash podia depender de secretos de auth si se agregaba luego | Agregar `COMMUNICATION_EVENT_HASH_SECRET` en `.env.example` y Render. |
| CES-H07 | Baja | No habia test unitario de minimizacion de eventos | Tests CSW26 cubrian envio, no persistencia segura | Agregar tests de `communicationAuditService` y ampliar `communicationService.test.js`. |

## Criterio de cierre

- Migracion local aplicada.
- Prisma validate/generate pasan.
- Tests de comunicaciones pasan.
- Backend test suite pasa.
- Frontend build pasa.
- Pantalla `Comunicaciones` compila con historial y bloque legal.
- AuditLock CES26 queda firmado.

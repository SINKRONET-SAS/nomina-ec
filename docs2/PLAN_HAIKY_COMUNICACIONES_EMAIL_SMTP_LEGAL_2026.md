# Plan Haiky - HAIKY-COMUNICACIONES-EMAIL-SMTP-LEGAL-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-COMUNICACIONES-EMAIL-SMTP-LEGAL-2026 |
| Codigo | CES26 |
| Estado | CES26-00..06 ejecutadas localmente |
| Fase actual | CES26-06 cerrada localmente |
| Alcance | diagnostico integral y cierre operativo/legal del servicio SMTP: verificacion de correo, recuperacion de clave, empleados, proteccion de datos y evidencia LOPDP |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/comunicaciones-email-smtp-legal-2026/MATRIZ_CES26_HALLAZGOS.md` |
| Runbook | `docs2/comunicaciones-email-smtp-legal-2026/RUNBOOK_CES26_SMTP_LOPDP.md` |
| Reporte | `docs2/comunicaciones-email-smtp-legal-2026/REPORTE_CES26_06_CIERRE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/COMUNICACIONES-EMAIL-SMTP-LEGAL-2026-{00..06}-*.md` |
| RULES | `RULES.md` |

## Objetivo

CES26 toma la base CSW26 ya implementada y cierra el frente legal-operativo que faltaba para comunicaciones por email: evidencia minima de envio, retencion configurable, minimizacion de datos, visibilidad en frontend y variables completas para SMTP sin guardar codigos, contenido de mensajes ni destinatarios en claro.

## Base legal consultada

- Ley Organica de Proteccion de Datos Personales, Registro Oficial Quinto Suplemento No. 459, 2021-05-26, PDF oficial MINTEL: `https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf`.

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CES26-00 | P0 | completed_documental | Baseline, diagnostico de CSW26, reglas y alcance legal. |
| CES26-01 | P0 | completed_local | Modelo de evidencia: `communication_events`, indices, RLS y retencion. |
| CES26-02 | P0 | completed_local | Registro de eventos desde SMTP/WhatsApp sin contenido ni destinatarios en claro. |
| CES26-03 | P0 | completed_local | Verificacion, recuperacion e invitaciones etiquetan tenant, usuario, finalidad y flujo. |
| CES26-04 | P1 | completed_local | Pantalla Comunicaciones muestra proteccion de datos e historial reciente. |
| CES26-05 | P1 | completed_local | Variables `.env.example`, Render y runbook SMTP/LOPDP actualizados. |
| CES26-06 | P0 | completed_local | QA, migracion local, AuditLock, cierre, commit y push. |

## Reglas CES26

- No almacenar codigos de verificacion, contenido de mensajes, contrasenas, tokens, telefonos ni correos completos en `communication_events`.
- Toda evidencia debe guardar solo hash HMAC, dominio o pista no sensible, estado, canal, plantilla, finalidad, tenant y correlacion.
- La retencion de eventos debe ser configurable por `COMMUNICATION_RETENTION_DAYS`.
- `COMMUNICATION_EVENT_HASH_SECRET` debe configurarse fuera del repositorio en produccion.
- La pantalla frontend debe mostrar estado y bloqueos sin secretos.
- SMTP sigue siendo canal primario para verificacion y recuperacion.
- WhatsApp queda fuera del alcance principal de CES26; se mantiene como canal complementario ya cubierto por CSW26.
- Commits esperados: `phase: CES26-XX task: ...`.

## Resultado local

- Nueva tabla `communication_events` con indices por tenant/fecha, plantilla/estado y retencion.
- RLS habilitado para eventos de comunicacion.
- `communicationAuditService` registra eventos con hash HMAC y metadata permitida.
- `communicationService` audita verificacion de correo, recuperacion de clave, invitaciones y pruebas SMTP.
- `Comunicaciones.jsx` muestra proteccion de datos, retencion e historial reciente.
- `.env.example` y `render.yaml` declaran retencion y secreto de hash.

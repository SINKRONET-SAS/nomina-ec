# Plan Haiky - HAIKY-COMUNICACIONES-SMTP-WHATSAPP-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-COMUNICACIONES-SMTP-WHATSAPP-2026 |
| Codigo | CSW26 |
| Estado | CSW26-00..07 ejecutadas localmente |
| Fase actual | CSW26-07 cerrada localmente |
| Alcance | diagnostico e implementacion de comunicaciones transaccionales SMTP y WhatsApp para registro, verificacion de correo, recuperacion de clave e invitaciones de app de asistencia |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/comunicaciones-smtp-whatsapp-2026/MATRIZ_CSW26_HALLAZGOS.md` |
| Reporte | `docs2/comunicaciones-smtp-whatsapp-2026/REPORTE_CSW26_07_CIERRE.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/COMUNICACIONES-SMTP-WHATSAPP-2026-{00..07}-*.md` |
| RULES | `RULES.md` |

## Objetivo

CSW26 convierte los codigos internos de autenticacion e invitacion en comunicaciones reales y verificables. El sistema debe enviar email por SMTP para registro, verificacion de correo y recuperacion de clave; ademas debe intentar WhatsApp Business para activar la app movil de asistencia cuando exista telefono y plantilla aprobada.

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CSW26-00 | P0 | completed_documental | Baseline, diagnostico de auth/invitaciones y candado previo. |
| CSW26-01 | P0 | completed_local | Servicio unico de comunicaciones con SMTP, WhatsApp, estado y protecciones anti-inyeccion. |
| CSW26-02 | P0 | completed_local | Verificacion de correo y recuperacion de clave conectadas a SMTP. |
| CSW26-03 | P0 | completed_local | Invitaciones de empleado por email y WhatsApp con resultado por canal. |
| CSW26-04 | P1 | completed_local | Pantalla web de comunicaciones y prueba SMTP. |
| CSW26-05 | P1 | completed_local | Variables de entorno, Render y documentacion operativa. |
| CSW26-06 | P0 | completed_local | Pruebas unitarias y gates de backend/frontend/mobile. |
| CSW26-07 | P0 | completed_local | Cierre de gobierno, AuditLock, commit y push. |

## Reglas CSW26

- No enviar secretos SMTP o WhatsApp a frontend, logs ni documentos.
- No devolver codigos de verificacion en respuestas API.
- No registrar mensajes como enviados si el canal esta incompleto.
- No bloquear invitaciones de empleado si WhatsApp no esta configurado; debe quedar estado visible por canal.
- SMTP es el canal primario para verificacion y recuperacion de clave.
- WhatsApp es canal complementario y requiere plantillas aprobadas por el proveedor.
- Toda configuracion faltante debe verse en frontend con variables requeridas.
- Commits esperados: `phase: CSW26-XX task: ...`.

## Resultado local

- `communicationService` centraliza SMTP y WhatsApp.
- Registro publico, registro interno, recuperacion y verificacion usan SMTP.
- Invitaciones de empleado envian email y registran intento WhatsApp.
- Dashboard permite confirmar y reenviar codigo de verificacion.
- Pantalla `Comunicaciones` muestra estado SMTP/WhatsApp y prueba de email.
- `.env.example` y `render.yaml` incluyen variables necesarias.

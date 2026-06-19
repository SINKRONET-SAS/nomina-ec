# Reporte CSW26-07 - Cierre comunicaciones SMTP y WhatsApp

## Diagnostico

| Hallazgo | Resultado |
|----------|-----------|
| Codigos de verificacion sin transporte real | Cerrado con SMTP via `communicationService`. |
| Recuperacion de clave sin email operativo | Cerrado con envio SMTP y anti-enumeracion. |
| Invitacion de empleado manual | Cerrado con email y WhatsApp complementario por plantilla. |
| WhatsApp inexistente | Cerrado como adaptador configurable Business Cloud API. |
| Estado oculto de comunicaciones | Cerrado con pantalla `Comunicaciones`. |

## Runtime implementado

- `backend/src/services/communicationService.js`: SMTP, WhatsApp, estado, normalizacion, plantillas y prueba.
- `backend/src/controllers/communicationController.js`: estado protegido y prueba SMTP.
- `backend/src/controllers/authController.js`: registro, verificacion y recuperacion conectados a SMTP.
- `backend/src/services/employeeAppInviteService.js`: invitacion/reenvio con resultado por canal.
- `frontend-web/src/pages/Configuracion/Comunicaciones.jsx`: estado visible de SMTP/WhatsApp.
- `frontend-web/src/pages/Dashboard.jsx`: banner para confirmar y reenviar codigo de verificacion.
- `frontend-web/src/pages/Empleados/ListaEmpleados.jsx`: feedback por canal al invitar empleados.
- `backend/.env.example` y `render.yaml`: variables SMTP/WhatsApp sin secretos.

## Gates ejecutados

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Backend audit | PASS | `npm.cmd audit --audit-level=low`: 0 vulnerabilidades. |
| Backend tests | PASS | `npm.cmd test -- --runInBand`: 21 suites, 82 tests. |
| Frontend build | PASS | `npm.cmd run build`: Vite/PWA genera dist sin warning de chunk grande. |
| PWA smoke | PASS | `npm.cmd run smoke:pwa`: manifest, assets y service worker cumplen. |
| Prisma validate | PASS | `npx.cmd prisma validate`: schema valido. |
| App stores | PASS | `npm.cmd run check:stores`: configuracion verificada. |
| Expo doctor | PASS | `npm.cmd run doctor`: 21/21 checks. |
| Sintaxis backend | PASS | `node --check` en servicios/controladores modificados. |

## Bloqueos externos

- Configurar credenciales reales SMTP en entorno seguro.
- Configurar `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` y version Graph API vigente.
- Crear y aprobar plantillas WhatsApp antes de envio productivo.
- Ejecutar prueba SMTP desde la pantalla `Comunicaciones` con el correo real del dominio.

## Resultado

CSW26 queda cerrado localmente con comunicaciones transaccionales implementadas y visibles. El sistema no expone codigos en API ni secretos en frontend, y reporta estados de entrega por canal.

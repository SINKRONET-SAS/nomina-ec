# Matriz CSW26 - Comunicaciones SMTP y WhatsApp

| ID | Severidad | Hallazgo | Evidencia | Accion |
|----|-----------|----------|-----------|--------|
| CSW-H01 | Alta | Codigos de verificacion solo quedaban en logs de desarrollo | `authController` generaba tokens y hacia `console.log` en no produccion | Implementar SMTP transaccional y retirar logs duplicados del controlador. |
| CSW-H02 | Alta | Recuperacion de clave no enviaba email real | `/auth/password/forgot` insertaba token sin transporte | Enviar codigo por SMTP con anti-enumeracion. |
| CSW-H03 | Alta | Invitacion de empleado dependia de copiar codigo manualmente | `ListaEmpleados` mostraba codigo/link, pero no habia envio operativo | Enviar invitacion por email y WhatsApp si esta configurado. |
| CSW-H04 | Media | WhatsApp no tenia adaptador ni variables | No existia servicio ni estado de Business Cloud API | Crear adaptador HTTP configurable y plantillas por entorno. |
| CSW-H05 | Media | Estado de comunicaciones oculto | No habia pantalla para saber si SMTP/WhatsApp estaban listos | Crear pantalla protegida `Comunicaciones`. |
| CSW-H06 | Media | Render no declaraba variables de comunicaciones | `render.yaml` solo tenia secretos AWS/JWT/frontend | Agregar variables SMTP y WhatsApp con `sync:false`. |
| CSW-H07 | Media | Riesgo de falsas promesas de envio | API podia decir "enviaremos" aunque no hubiera transporte | Devolver resultado `delivery` en flujos visibles y estados `not_configured`, `skipped`, `failed`. |
| CSW-H08 | Baja | Sin prueba automatizada del transporte | No habia cobertura de SMTP/WhatsApp | Agregar tests unitarios con mocks de Nodemailer y `fetch`. |

## Criterio de cierre

- Backend tests pasan.
- Frontend build pasa.
- App stores check pasa.
- `npm audit --audit-level=low` pasa en backend.
- Pantalla protegida muestra SMTP/WhatsApp sin secretos.
- AuditLock queda firmado y commit/push realizado.

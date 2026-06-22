# E2E26-04 - Invitaciones app y comunicaciones

Actua bajo `RULES.md`.

Objetivo: cerrar estados reales de invitacion app empleado con expiracion, reenvio, revocacion y evidencia de canal.

Tareas:

- Validar AuditLock E2E26-03.
- Revisar EmployeeAppInvite, EmployeeAppLink, CES26/CSW26 y pantalla RRHH.
- Adaptar script o servicio de expiracion automatica de invitaciones vencidas.
- Mostrar tablero: pendientes, vencidas, reenviadas, aceptadas y revocadas.
- Auditar envio email/WhatsApp sin guardar datos completos innecesarios.
- Probar anti-enumeracion y consentimiento LOPDP.

Cierre:

- Invitaciones no quedan pendientes eternas.
- RRHH puede operar estados desde PWA.
- AuditLock firmado para E2E26-04.
- Commit esperado: `phase: E2E26-04 task: invitaciones app operativas`.

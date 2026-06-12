# Fase 24 - Auth PWA y app movil

Actua bajo `RULES.md`.

Objetivo: conectar PWA y app movil a los contratos de auth de Nómina-Ec.

Tareas:

- Validar AuditLock de fase 23.
- Crear cliente auth web inspirado en `sinkroniq-mobile/landing/src/api/authClient.js`.
- Crear o extender cliente auth movil inspirado en `sinkroniq-mobile/mobile/src/api/auth.api.js`.
- Implementar pantallas de registro, login, recuperar password y reset.
- Usar almacenamiento seguro en movil para tokens.
- Unificar mensajes de error: credenciales invalidas, correo no verificado, tenant suspendido y plan vencido.

Cierre:

- Tests de clientes API web/movil.
- Smoke manual de login, registro y recuperacion.
- `expo-doctor` sin errores.
- AuditLock firmado para fase 24.

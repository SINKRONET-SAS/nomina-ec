# LPA26-06 - Registro y onboarding comercial

Actua bajo `RULES.md`.

Objetivo: convertir interes comercial en empresas activadas con baja friccion.

Tareas:

- Validar AuditLock de `LPA26-05`.
- Revisar registro OWNER, verificacion de correo, recuperacion de password y estados de plan.
- Mejorar onboarding inicial: datos de empresa, banco, usuarios/roles, parametros minimos y demo ficticia.
- Unificar errores visibles: correo no verificado, tenant suspendido, plan vencido, credenciales invalidas.
- Registrar auditoria con `correlationId`.

Cierre:

- Smoke registro/login/recuperacion.
- No hay fallos silenciosos.
- Build web y checks mobile relevantes.
- AuditLock firmado para `LPA26-06`.
- Commit esperado: `phase: LPA26-06 task: onboarding comercial`.


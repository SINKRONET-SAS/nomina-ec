# OAP26-02 - Parametros legales validados por owner

Contexto base: `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: reemplazar dependencia operativa de URL oficial por check de responsabilidad del owner. Una vez validado, solo owner/superadmin puede modificar o eliminar.

Entregables:
- Backend con metadata `approved_by` y `approved_at`.
- RBAC fail-closed para perfiles no autorizados.
- PWA con check visible y mensajes de responsabilidad.
- Tests de creacion, modificacion y bloqueo.

No degradar validaciones de valores legales ni tabla de impuesto a la renta.

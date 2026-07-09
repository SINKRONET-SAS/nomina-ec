# HU26-05 SaaS, contratos y roles humanos

Objetivo: ejecutar segunda pasada de humanizacion para separar SKNOMINA como producto SaaS de la relacion laboral cliente-trabajador.

Tareas:
- Revisar plantillas contractuales JSON y eliminar frases donde SKNOMINA parezca empleador, representante, asesor, intermediario o parte contractual.
- Reforzar `LegalText.jsx` para que terminos y condiciones indiquen que el cliente es responsable de datos, parametros, documentos, registros oficiales y cumplimiento laboral/tributario/proteccion de datos.
- Cambiar textos visibles `owner`, "fundador" y "Superadmin" por "Administrador principal" o "Soporte global".
- Mantener roles tecnicos `owner` y `superadmin` en rutas, RBAC, payloads y persistencia.

Reglas:
- No cambiar contrato de API ni base de datos por cambio editorial.
- No presentar plantillas o calculos como asesoria legal, laboral, tributaria o contable.
- No duplicar catalogos ni textos extensos.

Validacion:
- `rg` sin SKNOMINA en plantillas contractuales.
- `rg` de textos visibles sin `Owner`/`owner` fuera de identificadores tecnicos.

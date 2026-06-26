# ANV2-02 Comunicaciones reales

Objetivo: cerrar EMAIL-C01.

Instrucciones:
- Agregar contrato de proveedor de correo en `.env.example` y configuracion runtime.
- Implementar readiness de comunicaciones con estados visibles y auditables.
- En produccion, bloquear modo dev/mock sin proveedor real.
- Mantener logs estructurados con `correlationId`, `userId`, plantilla, proveedor y error.
- Agregar pruebas backend para proveedor ausente, proveedor configurado y bloqueo productivo.
- Exponer bloqueo/estado en PWA cuando afecte registro, recuperacion, invitaciones o comunicaciones.
- Commit esperado: `phase: ANV2-02 task: comunicaciones reales`.

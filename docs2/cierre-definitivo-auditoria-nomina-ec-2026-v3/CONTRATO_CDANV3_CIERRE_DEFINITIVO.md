# CONTRATO CDANV3 - CIERRE DEFINITIVO AUDITORIA NOMINA-EC V3

## Contrato de ejecucion

Este contrato gobierna cualquier cambio runtime derivado de CDANV3. Ninguna fase posterior a CDANV3-00 puede ejecutarse sin aprobacion explicita del usuario.

## Reglas no negociables

- El repositorio no debe contener secretos ni credenciales reales.
- `.github/CODEX_CONTEXT.md` es la unica ubicacion valida para contexto operativo Codex.
- `.vscode/AuditLock.json` debe actualizarse al cierre de cada fase.
- Los prompts se ejecutan en orden CDANV3-00 a CDANV3-10.
- Cada commit debe incluir `phase: CDANV3-XX task: ...`.
- Todo error de infraestructura debe tener `code`, `statusCode`, `correlationId` y `userId` si existe.

## Contrato Payphone

- Payphone es el proveedor de pago vigente para Ecuador.
- El webhook debe validar payload, referencia, tenant, plan, monto y estado aprobado antes de activar un plan.
- Si no hay credenciales o no se puede validar el pago, el sistema debe fallar cerrado y mostrar estado visible.
- No se debe activar un plan solo por callback de frontend.

## Contrato seed superadmin

- `seed-superadmin-owner.js` es la fuente existente.
- `render.yaml` debe invocar un comando idempotente de seed solo con variables `sync: false`.
- Si faltan variables obligatorias, el deploy debe fallar con mensaje claro o bloquear readiness, no crear usuarios incompletos.

## Contrato auth JWT

- Tokens nuevos deben incluir claims minimos: `userId`, `tenantId`, `email`, `rol`.
- Requests normales no deben consultar DB solo para reconstruir usuario.
- Operaciones sensibles deben usar verificacion fresca contra DB mediante middleware separado.
- Tokens legados deben tener compatibilidad temporal o rechazo claro y seguro.

## Contrato movilizacion

- La app movil debe poder registrar gastos offline en SQLite.
- El cierre mensual debe enviar un informe consolidado tipo factura al backend.
- Backend debe mantener estados `pendiente`, `aprobado`, `rechazado`.
- PWA debe permitir a RRHH/Owner aprobar o rechazar con motivo y monto de anticipo.
- El empleado debe ver el estado de su informe.
- La empresa DEMO debe incluir datos smoke ficticios para mostrar el flujo.
- Fotos/recibos son evidencia sensible; aplicar minimizacion, retencion y finalidad LOPDP.

## Contrato UX comercial

- No mostrar nombres de scripts, codigos internos o mensajes tecnicos al usuario final.
- Usar textos comerciales: "Mi Nomina", "Movilizacion", "Año", "Correo electronico invalido" solo si el archivo no admite tildes; preferir UTF-8 valido con tildes cuando sea seguro.
- Todo bloqueo operativo debe mostrar siguiente accion.

## Cierre

Una fase se considera cerrada solo si tiene:

- Cambios implementados o decision documentada.
- Pruebas ejecutadas.
- Reporte de fase.
- `AuditLock.json` firmado.
- Commit con formato de fase.

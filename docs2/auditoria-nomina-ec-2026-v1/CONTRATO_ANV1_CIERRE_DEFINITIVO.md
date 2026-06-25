# Contrato ANV1 - Cierre definitivo de auditoria Nomina-Ec 2026 V1

## Objetivo

Cerrar los hallazgos de auditoria Nomina-Ec 2026 V1 con cambios verificables, sin promesas comerciales falsas y sin parches que generen deuda mayor.

## Alcance incluido

- Seguridad de repositorio y exposicion de contexto interno.
- Renombre o aislamiento de `PLAN HAIKY`, `plan_haiky`, `haiky_migration` y nombres Render cuando aplique.
- D13, D14, horas extra e IESS bajo reglas Ecuador validadas.
- RBAC y auditoria de lectura para datos salariales y personales.
- LOPDP operativo: consentimientos versionados, exportacion de datos, retiro de opcionales y anonimizado controlado.
- PayPhone real/sandbox/mock con bloqueo visible y planes/IVA coherentes.
- PWA superadmin real.
- Parametros legales gobernados.
- Paridad mobile minima y textos visibles.
- Cifrado de cuentas bancarias.
- QA, rollback, seeds y release gate.

## Fuera de alcance inicial

- Recalculo automatico de nominas historicas cerradas sin aprobacion expresa.
- Rotacion real de credenciales productivas sin acceso autorizado del owner del ambiente.
- Validacion legal profesional final. El sistema debe dejar evidencia y bloqueos, pero la aprobacion legal externa sigue siendo obligatoria.
- Migracion masiva de toda la capa `pg` a Prisma en una sola fase.

## Condiciones de cierre por hallazgo

Cada hallazgo se cierra solo si cumple:

- Diagnostico contra codigo actual de `nuevo_nomina`.
- Cambio runtime cuando el hallazgo sea funcional.
- Exposicion frontend cuando afecte operacion, supervision o bloqueo.
- Prueba automatizada o verificacion documentada.
- Rollback o plan de reversa cuando toque datos, Render, pagos o nomina.
- AuditLock actualizado.

## Controles no negociables

- No mostrar PayPhone como produccion si `MOCK_MODE=true`.
- No exponer datos salariales a roles sin permiso explicito.
- No prometer retiro de consentimientos para tratamientos de obligacion legal/contractual; distinguir base legal de consentimiento opcional.
- No anonimizar el unico owner activo ni borrar registros laborales/tributarios con obligacion de conservacion.
- No guardar ni mostrar cuentas bancarias sin cifrado o mascara.
- No recalcular D13/D14 sobre historicos cerrados sin snapshot y aprobacion.
- No dejar `PLAN HAIKY` en pantallas, logs de usuario o documentos externos.
- No cerrar superadmin si solo existe backend.

## Entregables obligatorios

- Plan y matriz ANV1.
- Reporte por fase.
- Prompts por fase.
- Tests backend.
- Build web.
- Check mobile.
- Smoke visual cuando haya cambios UI.
- Commit por fase con formato `phase: ANV1-XX task: ...`.

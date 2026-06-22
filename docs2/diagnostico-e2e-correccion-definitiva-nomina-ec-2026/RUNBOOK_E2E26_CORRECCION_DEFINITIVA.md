# Runbook E2E26 - Correccion definitiva end-to-end

## Proposito

Guiar la ejecucion por fases de E2E26 sin romper el sistema existente. Este runbook no autoriza cambios runtime por si solo; cada fase requiere prompt de aprobacion y AuditLock valido.

## Orden de ejecucion

1. Confirmar AuditLock de la fase anterior.
2. Leer `RULES.md`, `CODEX_CONTEXT.md`, plan y matriz E2E26.
3. Revisar codigo real antes de modificar.
4. Implementar cambio acotado a la fase.
5. Exponer avance en PWA/app si afecta operacion.
6. Ejecutar gates de fase.
7. Actualizar reporte de fase y AuditLock.
8. Commit con formato `phase: E2E26-XX task: ...`.

## Scripts de referencia a adaptar

El diagnostico propone cuatro scripts. Antes de escribirlos, validar nombres reales de tablas/modelos, campos, RLS y servicios.

### `diagnose-e2e-process.js`

Objetivo: revisar tenant y periodo para detectar:

- usuarios activos sin correo verificado;
- parametros legales faltantes;
- empleados activos incompletos;
- invitaciones pendientes/vencidas;
- marcaciones sin periodo;
- novedades pendientes;
- empleados sin nomina calculada;
- nominas cerradas sin rol PDF.

### `expire-employee-app-invites.js`

Objetivo: cambiar invitaciones vencidas de pendiente a expirada y registrar evidencia auditable.

### `preclose-payroll-gate.js`

Objetivo: bloquear cierre si hay periodo inexistente/no calculado, novedades pendientes, empleados sin nomina, valores monetarios invalidos o roles requeridos faltantes.

### `audit-payroll-reopen-risk.js`

Objetivo: detectar reaperturas con beneficios ya descontados y exigir reverso/rectificacion antes de recalcular.

## Gates por dominio

### Tenant y registro

- Registro publico crea tenant, owner, trial, consentimiento y token de verificacion.
- Operacion sensible bloquea si falta email verificado o estado operacional minimo.
- PWA muestra que falta y como resolverlo.

### Usuarios/login

- Login no selecciona silenciosamente usuario por email duplicado entre tenants.
- Respuesta de ambiguedad es segura y anti-enumeracion.
- Roles `superadmin`, `owner`, `admin_rrhh`, `supervisor`, `empleado` mantienen compatibilidad.

### Empleados

- Cedula por tenant o politica global documentada.
- Clave bancaria obligatoria fuera del repo.
- Empleado preliminar no participa en nomina hasta completar ficha.
- Cambios sensibles emiten auditoria.

### Asistencia y app

- No marca sin unidad, zona, jornada y periodo.
- Foto y almuerzo coinciden con lo prometido.
- App Expo pasa doctor y smoke manual.

### Nomina

- Calculo solo con periodo abierto/calculable.
- Errores por empleado llevan a `calculation_failed`.
- Cierre atomico: calculo valido, roles, beneficios, estado cerrado.
- Reapertura con motivo, reverso/rectificacion y auditoria.

## Comandos de validacion

- `npx.cmd prisma validate` en `backend`.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` en `frontend-web`.
- `npm.cmd run smoke:pwa` en `frontend-web`.
- `npx.cmd expo-doctor` en `app-movil`.
- Busqueda de conflicto: `rg -n "^(<<<<<<<|=======|>>>>>>>)" .`

## Criterio de release E2E26-09

El plan solo puede cerrarse si existe evidencia de:

- registro tenant;
- verificacion o bloqueo de correo;
- onboarding operativo;
- empleado operativo;
- invitacion/activacion app;
- marcacion;
- novedad;
- calculo;
- cierre con rol;
- reapertura controlada o bloqueo de reapertura insegura.

## Cierre local 2026-06-22

E2E26-09 quedo cerrado localmente con evidencia en `REPORTE_E2E26_09_CIERRE_RUNTIME.md`.

Comandos ejecutados:

- `npx.cmd prisma validate`
- `npx.cmd prisma migrate deploy`
- `npm.cmd run seed:demo:reset`
- `npm.cmd run seed:demo`
- `npm.cmd run seed:demo:verify`
- `npm.cmd test -- --runInBand`
- `npm.cmd run smoke:pwa`
- `npm.cmd run check:stores`
- `npm.cmd run doctor`

Nota operativa: `seed:demo:reset` elimina la demo; para dejarla lista para revision comercial se debe ejecutar despues `seed:demo` y `seed:demo:verify`.

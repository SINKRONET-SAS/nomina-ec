# Runbook ANV1 - QA y release

## Preparacion

1. Confirmar rama y estado limpio.
2. Leer `RULES.md`.
3. Leer `.vscode/AuditLock.json`.
4. Confirmar que la fase que se va a ejecutar tiene aprobacion explicita.
5. Ejecutar diagnostico estatico del hallazgo antes de modificar runtime.

## Comandos base

```powershell
git status --short
npm run contracts
npm run prisma:validate
npm run test:backend
npm run build:web
npm run check:mobile
```

## Checks especificos por bloque

### Seguridad y naming

```powershell
rg -n "PLAN HAIKY|plan_haiky|haiky_migration|haiky-" backend/src frontend-web/src app-movil/src scripts render.yaml backend/.env.example .github/CODEX_CONTEXT.md
Test-Path CODEX_CONTEXT.md
Test-Path .github/CODEX_CONTEXT.md
rg -n "CODEX_CONTEXT.md|RULES.md" README.md .github docs2
```

Aceptar solo coincidencias documentales internas aprobadas.

### Nomina legal

```powershell
rg -n "decimo|decimoterc|decimocuarto|hora_extra|IESS|iess" backend/src backend/prisma
npm --workspace=backend test -- calculoNominaService.test.js calculoNominaService.batch.test.js --runInBand
```

Agregar tests de borde para:

- D13 con empleados que ingresan/salen dentro del periodo.
- D14 por region.
- Horas extra sobre limite semanal.
- IESS con afiliacion activa/inactiva y tipo relacion.

### LOPDP/RBAC

```powershell
rg -n "sueldo_bruto_mensual|gastos_personales|cuenta_bancaria|cedula" backend/src/controllers backend/src/services
rg -n "recordAudit|audit" backend/src
rg -n "consent_preferences|/api/privacidad|lopdp.data.export|lopdp.data.anonymize|sanitizeAuditPayload" backend/src backend/prisma frontend-web/src
```

Verificar que endpoints con datos sensibles:

- minimizan campos por rol;
- registran lectura cuando aplica;
- no exponen cuentas sin mascara.
- distinguen bases legales no revocables de consentimientos opcionales;
- exportan datos personales con auditoria y nota de retencion;
- bloquean anonimizar el unico owner activo.

### Monetizacion

```powershell
rg -n "PAYPHONE|MOCK_MODE|mock|precio|IVA|COMMERCIAL_IVA_RATE|Subscription|suscripcion" backend frontend-web render.yaml
```

No pasar release si:

- ambiente productivo usa mock sin bloqueo visible;
- landing muestra precios no gobernados sin IVA;
- suscripciones vencidas no tienen proceso de control.

### Superadmin/UI

```powershell
rg -n "Superadmin|superadmin|parametros legales|legal parameters" frontend-web/src backend/src
npm run build:web
```

Debe existir ruta PWA protegida y visible solo para rol autorizado.

## Release gate

Antes de merge o push final:

1. `npm run validate`.
2. `npm run check:mobile`.
3. `git diff --check`.
4. Smoke visual en rutas afectadas.
5. Actualizar reporte de fase y AuditLock.
6. Commit con formato Haiky.

## Rollback

- Para migraciones DB: cada fase que agregue migracion debe documentar SQL/manual de reversa.
- Para PayPhone: mantener flag de emergencia que bloquee pagos reales y muestre estado.
- Para naming Render/DB: no renombrar recursos productivos sin backup y ventana de mantenimiento.
- Para nomina legal: no sobrescribir historicos; usar snapshots/versiones.

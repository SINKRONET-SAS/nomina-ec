# Runbook AIV55 - QA y cierre

## Preparacion

1. Leer `RULES.md`, `CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.
2. Confirmar que la rama activa corresponde a `nomina-ec`.
3. No usar datos reales en pruebas, capturas ni seeds.

## Validaciones

```powershell
cd backend
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npm.cmd test -- calculoNominaService.test.js communicationService.test.js --runInBand
```

```powershell
cd frontend-web
npm.cmd run build
```

```powershell
cd app-movil
npm.cmd run check:stores
```

## Pruebas manuales sugeridas

- Crear o editar empleado y verificar modalidad de fondo de reserva: mensual / deposito IESS.
- Activar/desactivar consentimiento WhatsApp y reenviar invitacion app; sin consentimiento debe quedar omitida y auditada.
- Crear lote de novedades con permiso con sueldo, permiso sin sueldo, incapacidad IESS, vacaciones, comision y bono de desempeno.
- Abrir landing y confirmar que no aparezcan `RDEP`, `ATS` ni `parametros versionados`.
- En app movil, verificar etiquetas `Inicio de jornada`, `Fin de jornada`, `Inicio de almuerzo`, `Fin de almuerzo`.

## Rollback

- Revertir migracion AIV55 solo en ambiente no productivo con backup previo.
- Si se deshabilita WhatsApp, mantener auditoria de eventos `skipped` para trazabilidad.
- Si se revierte la UI, conservar columnas de DB hasta migracion formal de datos.

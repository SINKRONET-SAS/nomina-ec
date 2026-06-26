# Runbook ANV2 - QA y release

## Preparacion

1. Leer `RULES.md`.
2. Leer `.github/CODEX_CONTEXT.md`.
3. Confirmar que no exista `CODEX_CONTEXT.md` sensible en raiz.
4. Leer `.vscode/AuditLock.json` y validar firma de fase anterior.
5. Confirmar estado git limpio o aislar cambios no relacionados.

## Secuencia

1. ANV2-01: diagnostico runtime y evidencias de falsos positivos.
2. ANV2-02: comunicaciones reales y contrato de proveedor.
3. ANV2-03: timezone Ecuador.
4. ANV2-04: firmas legales.
5. ANV2-05: exposicion frontend.
6. ANV2-06: QA/release.

## Comandos esperados

```powershell
npm run contracts
npm run prisma:validate
npm run test:backend
npm run build:web
npm run check:mobile
git diff --check
```

## Smokes manuales

- Login/refresh sin errores repetidos en consola.
- Recuperacion de clave o verificacion de correo con proveedor configurado o bloqueo visible.
- Cierre de mes y reportes mostrando periodo correcto en America/Guayaquil al borde de mes.
- Generacion de contrato/rol/acta con bloque de firmas.

## AuditLock

Al cerrar cada fase:

1. Calcular SHA256 de `.vscode/AuditLock.json` anterior.
2. Registrar `updatedAt`.
3. Firmar `SHA256(previousAuditLockHash + updatedAt)`.
4. Registrar archivos modificados, gates y riesgos residuales.

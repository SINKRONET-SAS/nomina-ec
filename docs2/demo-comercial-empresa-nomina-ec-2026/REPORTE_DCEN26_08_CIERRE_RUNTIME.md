# Reporte DCEN26-08 - Cierre runtime demo comercial

Fecha: 2026-06-22
Plan: HAIKY-DEMO-COMERCIAL-EMPRESA-NOMINA-EC-2026
Codigo: DCEN26
Estado: cerrado localmente

## Resumen

Se implemento una empresa demo comercial reproducible para Nomina-Ec mediante `backend/scripts/seed-demo-commercial.js`. El seed es idempotente, reversible y bloquea eliminaciones si el tenant no esta marcado como demo con `demoCode=DCEN26`.

La demo queda lista para presentacion comercial con usuarios, empleados, estructura Quito/Guayaquil, zonas, jornadas, datos de pago ficticios, cargas familiares, contratos demo, asistencia de un mes, novedades y cinco cierres de nomina 2026.

## Comandos

Desde `backend`:

```powershell
npm.cmd run seed:demo
npm.cmd run seed:demo:verify
npm.cmd run seed:demo:reset
```

`seed:demo` reconstruye el tenant demo.
`seed:demo:verify` solo valida conteos.
`seed:demo:reset` elimina solo el tenant demo DCEN26.

## Resultado verificado

| Elemento | Resultado |
|----------|-----------|
| Tenant demo | 1 |
| Usuarios demo | 4 |
| Empleados ficticios | 30 |
| Cargas familiares | 20 |
| Unidades organizativas | 6 |
| Zonas de marcacion | 2 |
| Jornadas | 2 |
| Marcaciones mayo 2026 | 1284 |
| Novedades | 101 |
| Periodos cerrados 2026 | 5 |
| Roles cerrados 2026 | 150 |
| Perfiles bancarios demo | 1 |

## Seguridad y datos

- No se usan datos reales de personas, empresas, bancos, telefonos ni correos.
- Las cuentas bancarias de empleados son ficticias y se cifran durante el seed.
- `BANK_ACCOUNT_ENCRYPTION_KEY` queda sin valor en `backend/.env` local por decision operativa; el seed usa clave demo efimera en memoria si no hay clave valida.
- Las credenciales generadas quedan en `backend/.demo-credentials.json`, archivo ignorado por git.
- Roles PDF y archivos bancarios demo usan URLs `demo://` para evitar carga productiva accidental.

## Gates ejecutados

- `node -c backend/scripts/seed-demo-commercial.js`: PASS.
- `npx.cmd prisma validate` en `backend`: PASS.
- `npm.cmd run seed:demo`: PASS, demo reconstruida y verificada.
- `npm.cmd run seed:demo:verify`: PASS.
- `npm.cmd test -- --runInBand` en `backend`: PASS, 27 suites y 105 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `npm.cmd run smoke:pwa` en `frontend-web`: PASS.
- JSON de `.vscode/AuditLock.json` y `backend/package.json`: PASS.
- Gate UTF-8 sin BOM en archivos modificados: PASS.
- `git diff --check`: PASS, solo advertencias de normalizacion CRLF esperadas en Windows.

## Riesgos residuales

- Antes de una presentacion externa se debe ejecutar smoke visual en PWA con backend local levantado.
- Las credenciales demo locales deben rotarse por cada ambiente si se publica una demo compartida.
- No ejecutar `seed:demo:reset` al cierre si la demo debe quedar disponible.

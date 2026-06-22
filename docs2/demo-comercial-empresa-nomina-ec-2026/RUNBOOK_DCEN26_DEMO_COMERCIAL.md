# Runbook DCEN26 - Demo comercial Nomina-Ec

## Proposito

Preparar una empresa demo completamente configurada para presentaciones comerciales sin usar datos reales ni afectar tenants productivos.

## Principios

- Ejecutar solo en ambiente local, staging o demo autorizado.
- Nunca usar correos, telefonos, cuentas bancarias o cedulas de personas reales.
- Usar identificadores y nombres ficticios marcados como demo.
- Confirmar `RULES.md` y `AuditLock.json` antes de cada fase.

## Preparacion esperada

1. Confirmar rama y estado git limpio.
2. Confirmar variables de entorno demo. `BANK_ACCOUNT_ENCRYPTION_KEY` puede quedar sin valor en `.env` local; el seed usa clave demo efimera en memoria si no hay clave bancaria valida.
3. Ejecutar migraciones pendientes.
4. Ejecutar seed demo.
5. Re-ejecutar seed para validar idempotencia.
6. Abrir PWA y validar recorrido comercial.

## Comandos runtime

Ejecutar desde `backend`:

```powershell
npx.cmd prisma validate
npm.cmd run seed:demo
npm.cmd run seed:demo:verify
```

Comando de reset seguro, solo cuando se quiera desmontar la demo:

```powershell
npm.cmd run seed:demo:reset
```

El seed genera `backend/.demo-credentials.json` con credenciales temporales locales. Ese archivo esta ignorado por git y no debe copiarse al repositorio.

## Validaciones operativas

- Tenant demo existe y esta marcado como demo.
- Hay 4 usuarios demo activos con roles definidos.
- Hay 30 empleados ficticios completos.
- Existen unidades Quito/Guayaquil, zonas, jornadas y centros de costo.
- Hay asistencias de un mes con casos normales y excepciones.
- Hay cinco periodos 2026 cerrados.
- Hay 150 roles cerrados para enero-mayo 2026.
- Dashboard no aparece vacio.
- Reportes y roles se descargan con marca demo.
- Reset demo no toca tenants no demo.

## Conteos esperados DCEN26

| Elemento | Esperado |
|----------|----------|
| Tenants demo DCEN26 | 1 |
| Usuarios demo | 4 |
| Empleados ficticios | 30 |
| Cargas familiares demo | 20 |
| Unidades Quito/Guayaquil | 6 |
| Zonas de marcacion | 2 |
| Jornadas | 2 |
| Marcaciones mayo 2026 | 1284 |
| Novedades | 101 |
| Periodos cerrados 2026 | 5 |
| Roles cerrados 2026 | 150 |
| Perfiles bancarios demo | 1 |

## Reset seguro

El reset debe exigir:

- Codigo de tenant demo exacto.
- Confirmacion explicita.
- Bloqueo si el tenant no tiene bandera demo.
- Log con `correlationId`.
- Resumen de registros eliminados.

## Gates de cierre

- `npx.cmd prisma validate`.
- `npm.cmd test -- --runInBand`.
- `npm.cmd run build`.
- `npm.cmd run smoke:pwa`.
- Verificacion manual de navegacion demo.
- UTF-8 sin BOM.
- AuditLock firmado.

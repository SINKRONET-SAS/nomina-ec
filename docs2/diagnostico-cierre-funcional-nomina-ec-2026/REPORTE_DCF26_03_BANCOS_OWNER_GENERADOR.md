# Reporte DCF26-03 - Bancos OWNER conectados al generador

Fecha: 2026-06-15  
Fase: `DCF26-03`  
Resultado: completada.

## Cambio realizado

`backend/src/services/bancoAebGenerator.js` ahora busca primero el perfil configurado en `perfiles_bancarios` para el tenant y banco solicitado. Si no existe perfil tenant/global en base, usa el JSON historico `bank-file-profiles.json` como fallback controlado.

## Comportamiento nuevo

- `generarArchivoBanco` usa `getBankProfileForTenant(tenantId, banco)`.
- Se soporta busqueda por `banco_codigo`, `banco_nombre` o `field_map.profile`.
- El perfil tenant normaliza separador, encoding, cabecera, trailer, longitud de cuenta, campos y codigo bancario.
- El resultado y la auditoria incluyen `bankProfile` con `source`, `key`, `bankCode` e `id`.
- Se mantiene compatibilidad con perfiles iniciales `PICHINCHA`, `GUAYAQUIL` y `PRODUBANCO`.
- El test bancario ya no abre pool real de DB y cubre perfil tenant + fallback.

## Validacion

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Test bancario | PASS | `npm.cmd test -- bancoAebGenerator.test.js --runInBand`: 5 tests. |
| Sintaxis | PASS | `node --check src/services/bancoAebGenerator.js`. |
| Churn reducido | PASS | `bancoAebGenerator.test.js` bajo de ~166 s a ~4 s al mockear DB. |

## Riesgos residuales

- Cada banco aun requiere ficha tecnica real validada con archivo DEMO antes de produccion.
- Si un perfil tenant usa un `banco_codigo` no numerico y no define `field_map.bankCode`, el generador bloquea con error claro.

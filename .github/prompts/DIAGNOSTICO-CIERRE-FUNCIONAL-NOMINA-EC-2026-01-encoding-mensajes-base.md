# DCF26-01 - Encoding y mensajes base

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Corregir mojibake y textos rotos en runtime, metadatos y mensajes base sin cambiar comportamiento funcional.

## Alcance

- `backend/src/app.js`
- `backend/package.json`
- `backend/src/services/configurationService.js`
- Cualquier archivo runtime detectado por `rg "NÃ|Ã³|Ã±|Â"`.

## Reglas

- Mantener UTF-8 real.
- No introducir textos duplicados ni mensajes tecnicos opacos.
- No tocar logica de negocio fuera de correcciones de encoding.
- Debe quedar evidencia con antes/despues y `rg` limpio.

## Entregables funcionales

- Textos visibles y respuestas API sin mojibake.
- Prueba o verificacion automatizada con `rg`.
- Reporte `docs2/diagnostico-cierre-funcional-nomina-ec-2026/REPORTE_DCF26_01_ENCODING.md`.

## Gates

- `rg "NÃ|Ã³|Ã±|Â" backend/src frontend-web/src app-movil/src` no debe encontrar runtime roto.
- `npm.cmd test -- --runInBand` en backend.
- `npm.cmd run build` en frontend.

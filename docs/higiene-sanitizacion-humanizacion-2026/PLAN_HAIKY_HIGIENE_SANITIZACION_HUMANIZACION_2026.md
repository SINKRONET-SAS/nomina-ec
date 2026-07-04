# PLAN HAIKY HIGIENE SANITIZACION HUMANIZACION 2026

## Identificacion

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-HIGIENE-SANITIZACION-HUMANIZACION-2026 |
| Codigo | HSH26 |
| Estado | Ejecutado localmente |
| Fuente | Solicitud de higiene y sanitizacion, revision ortografica, UTF-8, depuracion de mojibake, UI/UX y humanizacion |
| Reglas | `RULES.md` |
| Contexto | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/HSH26-00` a `.github/prompts/HSH26-05` |

## Objetivo

Cerrar de forma definitiva la deuda visible de texto corrupto y reforzar un procedimiento repetible para higiene tecnica, sanitizacion, ortografia, UTF-8, UI/UX y humanizacion de mensajes en SKNOMINA.

## Alcance ejecutado

- Escaneo repo-wide de archivos `.js`, `.jsx`, `.json`, `.md`, `.mjs`, `.ts` y `.tsx` para mojibake, caracteres de reemplazo y separadores corruptos.
- Correccion runtime de textos visibles en Parametrizacion web.
- Confirmacion de ausencia de mojibake despues del cambio.
- Creacion de prompts Haiky por fase.
- Actualizacion de contexto y AuditLock.

## Fases

| Fase | Prioridad | Estado | Entregable |
|------|-----------|--------|------------|
| HSH26-00 | P0 | completed_documental | Baseline, reglas y alcance sin runtime riesgoso. |
| HSH26-01 | P0 | completed_local | Depuracion de mojibake y UTF-8 en superficie escaneada. |
| HSH26-02 | P0 | completed_local | Revision ortografica visible de Parametrizacion. |
| HSH26-03 | P0 | completed_local | Sanitizacion: verificacion de contratos existentes y no exposicion de PII nueva. |
| HSH26-04 | P1 | completed_local | UI/UX y humanizacion de copy operativo sin cambiar contratos. |
| HSH26-05 | P0 | completed_local | QA release, reportes, contexto y AuditLock firmado. |

## Criterios de cierre

- Ninguna coincidencia de mojibake ni caracteres de reemplazo en archivos de texto gobernados por el plan.
- Los archivos modificados permanecen en UTF-8 sin BOM.
- La UI afectada compila.
- No se alteran contratos publicos de API.
- No se tocan cambios locales ajenos al plan.
- Todo bloqueo o riesgo residual queda documentado.

## Riesgos residuales

- La revision ortografica total de todo el producto requiere una fase editorial mas amplia si se decide acentuar textos historicamente escritos en ASCII.
- Los cambios locales previos en backend y Prisma se preservaron sin intervenir para evitar mezclar alcances.

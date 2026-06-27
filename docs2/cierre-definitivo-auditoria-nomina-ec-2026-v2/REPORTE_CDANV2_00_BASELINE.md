# Reporte CDANV2-00 - Baseline documental

CDANV2-00 crea la linea documental para responder a la auditoria V2 nueva sin ejecutar runtime.

## Decisiones

- `SEC-V2-01` se trata como falso positivo controlado: no se cambia SBU 2026 a USD 470.
- El contexto se ubica en `.github/CODEX_CONTEXT.md`, no en raiz.
- `docs2` se conserva como gobierno activo; no es candidato de eliminacion por esta auditoria.
- Runtime queda pendiente de aprobacion explicita por fase.

## Fuentes revisadas

- `nominaec_v2_hallazgos.jsx`
- `nominaec_v2_scripts.jsx`
- `AuditoriaNominaEC2026V2.jsx`
- `RULES.md`
- `.github/CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`
- `scripts/verify-system-contracts.mjs`

## Riesgos

- La fuente oficial MDT debe archivarse antes de tocar parametros legales productivos.
- Varios hallazgos fuente parecen ya superados por CDAN26; CDANV2-01 debe contrastar contra runtime real antes de implementar.

# Reporte RPE26 - Ejecucion reportes entidades publicas Ecuador 2026

Fecha: 2026-07-12.

## Resultado

RPE26 ejecuta la respuesta a los hallazgos de Reportes Entidades. RDEP y Formulario 107 quedan como reportes SRI; IESS queda degradado a prevalidacion operativa y el XML queda bloqueado por defecto.

## Cambios aplicados

- `frontend-web/src/pages/Nomina/DescargarReportes.jsx` separa reportes SRI de preparacion IESS.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx` agrega busqueda para Formulario 107 y limita el selector visible a 50 empleados filtrados.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx` prioriza reportes verticales y marca la matriz dinamica como uso puntual.
- `backend/src/services/iessSaeGenerator.js` bloquea XML IESS con `IESS_XML_FORMAT_NOT_VALIDATED` salvo `ALLOW_EXPERIMENTAL_IESS_XML=true`.
- `backend/src/config/iess/sae-source-manifest.json` declara `pending_official_iess_format`.
- `frontend-web/src/pages/Landing.jsx` deja de prometer `XML SAE IESS`.
- `scripts/verify-system-contracts.mjs` agrega contrato antiregresion contra `Generar XML SAE` y `XML SAE IESS`.
- `.github/CODEX_CONTEXT.md` registra RPE26 y supersede la parte de DPS26 que trataba SAE/IESS como XML oficial.

## Gates

- `node --check backend/src/services/iessSaeGenerator.js`: PASS.
- `node --check scripts/verify-system-contracts.mjs`: PASS.
- `npm.cmd --workspace=backend test -- iessSaeGenerator.test.js app.routes.test.js --runInBand`: PASS, 2 suites y 29 tests.
- `npm.cmd run contracts`: PASS.
- `npm.cmd --workspace=frontend-web run build`: PASS; Vite genero PWA y mostro solo advertencia de chunk mayor a 500 kB existente.
- `git diff --check`: PASS con avisos LF/CRLF esperados en Windows.

## Riesgos residuales

- IESS puede publicar o exigir un formato especifico distinto al contrato experimental local. Hasta tener fuente oficial, no se debe habilitar XML productivo.
- Formulario 107 masivo en ZIP queda como mejora posterior; esta fase mejora busqueda individual y gobierno visual.
- La matriz dinamica se conserva por compatibilidad, pero no debe ser recomendada para nominas grandes.

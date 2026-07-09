# HU26-00 baseline

Objetivo: confirmar el alcance de humanizacion y sintesis PWA sin modificar backend ni cambios URR26 abiertos.

Reglas:
- Leer `RULES.md` y `.github/CODEX_CONTEXT.md`.
- Identificar pantallas con texto largo, jerga de desarrollo, ortografia visible pendiente o instrucciones redundantes.
- No reportar falsos positivos: solo incluir hallazgos con archivo y texto real.
- No tocar API ni contratos.

Salida esperada:
- Plan Haiky HU26 en `docs2/`.
- Informe diagnostico HU26.
- Lista de archivos runtime candidatos.

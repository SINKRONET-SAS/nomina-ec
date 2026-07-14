# HAIKY AIV2-01 - Diagnostico JS

Ejecuta `npm run audit:integral:v2`.

Objetivo:
- Escanear UTF-8, mojibake visible, catch silencioso, TODO/FIXME/HACK, senales simuladas y duplicacion de helpers.
- Reconfirmar cada hallazgo contra codigo real antes de proponer cambios.
- Clasificar mocks de pruebas como no productivos.
- Emitir `docs2/auditoria-integral-v2-haiky-2026/DIAGNOSTICO_JSON.json`, `DIAGNOSTICO_AUTOMATIZADO.md` e `INFORME_DIAGNOSTICO.md`.

Gates:
- No reportar falsos positivos sin archivo y linea.
- No eliminar archivos solo por baja referencia estatica.
- Candidatos de eliminacion deben incluir razon y bloqueo.

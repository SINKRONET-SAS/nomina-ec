# Runbook APK26V4 QA Release

## Verificaciones locales

1. `npm.cmd run check:mobile`
2. `npm.cmd --workspace=frontend-web run build`
3. `npm.cmd --workspace=backend test -- paymentController.test.js --runInBand`
4. `git diff --check`

## Smoke manual APK/AAB

- Generar APK preview con EAS.
- Instalar en Android 14 y Android 15.
- Revisar login, shell por rol, marcacion GPS, teclado en formularios y navegacion inferior.
- Generar AAB production solo si el APK no muestra regresion visual.

## Gobierno de documentos

- Los anexos binarios de `docs2` quedan en disco local pero fuera del tracking.
- Los planes, matrices, runbooks y prompts se mantienen versionados hasta migrar el gobierno Haiky a repositorio privado.

# REPORTE APK26-02 - Metadatos Play Store

## Cambios

- `app-movil/app.json` agrega `expo.description`.
- `app-movil/app.json` agrega `extra.androidPrivacyPolicyUrl`.
- `app-movil/scripts/check-store-readiness.mjs` bloquea builds de tienda sin descripcion o URL publica de privacidad Android.

## Nota Expo

`android.privacyPolicyUrl` fue probado y `expo-doctor` lo rechazo como propiedad no soportada. Se conserva el dato en
`extra.androidPrivacyPolicyUrl` para Play Console y para controles internos de readiness.

## Validacion

- `npm.cmd run check:mobile`: PASS.
- `npx.cmd expo-doctor` en `app-movil`: PASS, 18/18 checks.


# LPA26-04 - App movil lista para tiendas

## Resultado

La app movil queda preparada localmente para flujo de Google Play y Apple App Store con configuracion Expo, EAS, identificadores, assets de tienda, metadata y bloqueos externos documentados.

## Cambios implementados

- `app-movil/app.json` creado con nombre comercial, scheme, version, package Android, bundle iOS, permisos y URLs publicas.
- `app-movil/eas.json` creado con perfiles development, preview y production.
- Assets PNG versionados para icono, adaptive icon, splash source, notification icon, feature graphic y screenshots demo.
- `app-movil/scripts/check-store-readiness.mjs` valida configuracion store-ready local.
- `app-movil/package.json` agrega `doctor` y `check:stores`.
- Textos mojibake corregidos en la app movil.
- API movil permite `EXPO_PUBLIC_API_URL` con fallback local de desarrollo.

## Validaciones

- `npm.cmd run check:stores`: PASS.
- `npx.cmd expo-doctor`: PASS 21/21.
- Busqueda de mojibake en `app-movil/src` y `app-movil/app.json`: sin coincidencias.

## Bloqueos externos

- Google Play Console no verificable localmente.
- Apple Developer / App Store Connect no verificable localmente.
- `extra.eas.projectId` queda como placeholder hasta vincular proyecto EAS real.
- URLs `nomina-ec.com` deben existir publicamente antes de publicar.
- La revision legal LOPDP debe completarse antes de enviar a revision de tiendas.

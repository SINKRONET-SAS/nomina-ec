# Guia LPA26 Android/iOS Nomina-Ec

## Estado local

- `app-movil/app.json` define `android.package`, `ios.bundleIdentifier`, versionCode y buildNumber.
- `app-movil/eas.json` define perfiles `development`, `preview` y `production`.
- `npm.cmd run check:stores` valida assets y URLs requeridas.
- `npx.cmd expo-doctor` pasa 21/21 localmente.

## Comandos

```powershell
cd "C:\proyectos web\nuevo_nomina\app-movil"
npm.cmd run check:stores
npx.cmd expo-doctor
eas build --platform android --profile preview
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Android internal testing

1. Confirmar Play Console activo.
2. Confirmar `ec.com.nomina.app` disponible y definitivo.
3. Configurar ficha con metadata de `METADATA_STORES_NOMINA_EC.md`.
4. Subir AAB de `production`.
5. Activar pista internal testing.
6. Cargar politica de privacidad, soporte y eliminacion de cuenta.
7. Revisar permisos de camara y ubicacion con textos de uso.

## Apple TestFlight

1. Confirmar Apple Developer activo.
2. Confirmar bundle identifier `ec.com.nomina.app`.
3. Configurar `appleTeamId` y `ascAppId` fuera del repositorio si aplica.
4. Ejecutar build iOS production.
5. Subir a App Store Connect.
6. Activar TestFlight interno.
7. Confirmar Privacy Nutrition Labels segun LOPDP y tratamiento real.

## Rollback de tienda

- Android: pausar rollout o promover version anterior desde Play Console si esta disponible.
- iOS: detener version en App Store Connect y conservar build anterior aprobado.
- Web/PWA: revertir deploy web y limpiar cache mediante nueva version de service worker.

## Criterio de no publicacion

- No publicar si las URLs legales no son publicas.
- No publicar si se usan capturas con datos reales.
- No publicar si LOPDP y politicas no tienen revision profesional.
- No publicar si `extra.eas.projectId`, cuentas de tienda o certificados siguen en placeholders.

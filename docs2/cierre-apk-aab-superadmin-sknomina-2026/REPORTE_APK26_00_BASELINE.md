# REPORTE APK26-00 - Baseline

Fecha: 2026-06-28

## Lectura del repo

- `app-movil/package.json` usa Expo `~54.0.35`, React Native `0.81.5` y React `19.1.0`.
- `app-movil/app.json` no tenia `description` ni URL especifica de privacidad Android para Play Console.
- `app-movil/scripts/check-store-readiness.mjs` valida identificadores, URLs extra y assets, pero no validaba
  descripcion ni politica Android.
- `frontend-web/src/pages/Superadmin.jsx` era un wrapper de 5 lineas sobre `PlanesGestion`.
- `frontend-web/src/pages/PlanesGestion.jsx` ya consumia parte de `/superadmin/overview`, pero mezclado con
  gestion de planes.
- `app-movil/src/services/api.js` ya expone `mobileAPI.me()`.
- `backend/src/controllers/mobileController.js` retorna `user.rol` en `/api/mobile/me`.
- `backend/src/services/legalParameterService.js` usa `validado_oficial` como guard productivo.
- `.gitignore` ya ignora `docs2/private/`, `docs2/_local/` y variantes locales de AuditLock.

## Fuentes externas verificadas

- Google Play exige Android 15 API 35 o superior para nuevas apps y updates desde 2025-08-31.
- Expo SDK 54 declara `compileSdkVersion` 36 y `targetSdkVersion` 36.

## Decision

El upgrade a SDK 56 no se ejecuta como fix automatico en APK26 porque el bloqueo auditado de target 34 no
corresponde al estado oficial de Expo SDK 54. Se cierra con evidencia, metadatos faltantes, gate de tienda y
se deja SDK 56 como mejora futura controlada.

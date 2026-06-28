# REPORTE APK26-01 - Diagnostico runtime

Fecha: 2026-06-28

## Resultado

- HAL-1 queda reclasificado: Expo SDK 54 usa Android target 36, no target 34.
- Google Play exige target API 35 o superior desde 2025-08-31 para nuevas apps y updates.
- No se ejecuta upgrade a SDK 56 en este cierre porque no es necesario para cumplir el target y aumentaria el riesgo.
- HAL-2 confirmado: `Superadmin.jsx` era wrapper minimo de `PlanesGestion`.
- HAL-3 confirmado: faltaba `expo.description`.
- HAL-4 confirmado con ajuste: Expo no acepta `android.privacyPolicyUrl`; se usa `extra.androidPrivacyPolicyUrl`.
- HAL-6 confirmado: app movil no diferenciaba rol despues de login.
- HAL-7 confirmado con condicion: no se debe cambiar `sourceStatus` a un valor parcial porque produccion solo desbloquea `validado_oficial`.

## Evidencia local

- `app-movil/package.json`: Expo `~54.0.35`.
- `app-movil/scripts/check-store-readiness.mjs`: gate de tienda extendido.
- `backend/src/controllers/mobileController.js`: `/mobile/me` retorna `user.rol`.
- `backend/src/services/legalParameterService.js`: guard productivo contra `validado_oficial`.


# Runbook LPA26 go-live

## Estado de salida

LPA26 deja Nomina-Ec listo localmente para publicar landing/PWA y preparar envios a Google Play y Apple App Store, con bloqueos externos documentados.

## Pre go-live web/PWA

1. Confirmar dominio publico.
2. Publicar rutas `/`, `/registro`, `/privacidad`, `/terminos`, `/soporte` y `/eliminar-cuenta`.
3. Ejecutar `npm.cmd run smoke:pwa`.
4. Verificar que service worker no cachea `/api`.
5. Confirmar que no existe analitica no esencial activa sin consentimiento.
6. Confirmar revision legal LOPDP de politicas.

## Pre go-live Android

1. Confirmar Google Play Console.
2. Confirmar package `ec.com.nomina.app`.
3. Reemplazar URLs placeholder por dominio real.
4. Ejecutar `npm.cmd run check:stores`.
5. Ejecutar `npx.cmd expo-doctor`.
6. Generar AAB production con EAS.
7. Subir a internal testing.
8. Validar ficha, Data Safety, permisos, privacidad y eliminacion de cuenta.

## Pre go-live iOS

1. Confirmar Apple Developer Program.
2. Confirmar bundle `ec.com.nomina.app`.
3. Configurar `appleTeamId`, `ascAppId`, certificados y perfiles.
4. Generar build production con EAS.
5. Subir a TestFlight interno.
6. Completar Privacy Nutrition Labels.
7. Validar permisos de ubicacion y camara.

## Monitoreo inicial

- Errores de login, registro, recuperacion y refresh token.
- Rechazos de consentimiento o abandono en registro.
- Instalaciones PWA y eventos de service worker.
- Errores de API movil por URL productiva.
- Crash reports de app movil.
- Tickets de privacidad, eliminacion de cuenta y soporte.

## Rollback

- Web/PWA: revertir deploy y publicar nueva version de service worker.
- Android: pausar rollout, retener version anterior o cerrar pista interna.
- iOS: detener TestFlight o remover build de revision.
- Backend: revertir deploy compatible; no se agregaron migraciones en LPA26.

## No publicar si

- No hay revision legal LOPDP.
- Las URLs publicas no existen.
- EAS mantiene projectId placeholder.
- No existen cuentas/certificados de tiendas.
- Se detectan datos reales en screenshots, demos o assets.

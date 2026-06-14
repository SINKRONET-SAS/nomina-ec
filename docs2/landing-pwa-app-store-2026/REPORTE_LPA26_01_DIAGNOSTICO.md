# LPA26-01 - Diagnostico anti-churn

## Resultado

La fase LPA26-01 queda cerrada como diagnostico previo a runtime. Se valido el AuditLock de LPA26-00, se inventariaron rutas, PWA, assets, app movil y brechas comerciales/legales. No se modifico runtime en esta fase.

## Inventario web

### Rutas publicas

- `/`: landing publica en `frontend-web/src/pages/Landing.jsx`.
- `/login`: ingreso en `frontend-web/src/pages/Login.jsx`.
- `/registro`: registro OWNER en `frontend-web/src/pages/Register.jsx`.
- `/recuperar-password`: recuperacion en `frontend-web/src/pages/ForgotPassword.jsx`.
- `/precios`: planes en `frontend-web/src/pages/Planes.jsx`.
- `/pago/resultado`: resultado de pago en `frontend-web/src/pages/PaymentResult.jsx`.
- `/privacidad`: politica publica en `frontend-web/src/pages/LegalText.jsx`.
- `/terminos`: terminos publicos en `frontend-web/src/pages/LegalText.jsx`.

### Rutas privadas

- `/dashboard`: panel principal.
- `/dashboard/empleados`, `/dashboard/empleados/nuevo`, `/dashboard/empleados/:id/terminar`.
- `/dashboard/asistencia/novedades`, `/dashboard/asistencia/reporte`.
- `/dashboard/nomina/cerrar`, `/dashboard/nomina/roles`, `/dashboard/nomina/reportes`.
- `/dashboard/documentos/contratos`, `/dashboard/documentos/finiquitos`.
- `/dashboard/configuracion/parametrizacion`.
- `/dashboard/auditoria`.

### PWA y assets

- Manifest y Workbox se generan desde `frontend-web/pwa.config.js`.
- Vite registra `vite-plugin-pwa` en `frontend-web/vite.config.js`.
- Assets publicos actuales: `favicon.svg`, `icon.svg`, `maskable-icon.svg`.
- No existen PNG versionados para app stores, screenshots, feature graphic, apple touch icon ni OpenGraph.
- Workbox ya niega fallback para `/api` y define `NetworkOnly` para API, pero mantiene `NetworkFirst` para navegacion. Requiere smoke que pruebe que no cachea datos de nomina.

### Privacidad y almacenamiento

- No se detecto analitica activa (`gtag`, `posthog`, `mixpanel`) en frontend.
- La sesion web usa `localStorage` para `token` y `usuario`; esto es riesgo P0 por datos laborales y seguridad de sesion si se expone a XSS.
- Las politicas publicas existen pero son minimas y no cubren retiro de consentimiento, derechos del titular, retencion, incidentes, procesadores ni eliminacion de cuenta.

## Inventario mobile

- App React Native + Expo en `app-movil`.
- No existe `app.json` ni `app.config.js`.
- No estan definidos `android.package`, `ios.bundleIdentifier`, `versionCode`, `buildNumber`, politicas de privacidad, enlaces de soporte ni configuracion EAS.
- Pantallas actuales: `LoginScreen`, `MarcacionScreen`, `MisMarcacionesScreen`.
- Servicios: API, camara y geolocalizacion.
- La app usa `expo-secure-store` para token, lo cual es mejor que `localStorage`.

## Brechas P0

- Mojibake visible en landing, PWA, legales, registro y app movil (`NÃ³mina`, `PolÃ­tica`, `sesiÃ³n`, etc.).
- Landing actual comunica operacion general, pero no muestra el flujo completo de valor Ecuador: empleados, novedades, roles, cierre, bancos, RDEP/IESS, documentos y auditoria.
- No hay configuracion store-ready en app movil.
- Politica de privacidad y terminos son demasiado generales para LOPDP.
- No hay smoke PWA que pruebe manifest, service worker y ausencia de cache de `/api`.
- No hay metadata de tienda ni assets PNG requeridos por Google Play / Apple App Store.

## Brechas P1

- Registro OWNER acepta terminos y privacidad, pero no registra version/timestamp visible de consentimiento LOPDP en el flujo.
- No existe UI publica de retiro de consentimiento, eliminacion de cuenta o contacto de derechos ARCO/LOPDP.
- No hay pagina publica especifica de seguridad, soporte o eliminacion de cuenta.
- No hay guia de release Android/iOS ni bloqueo externo documentado para Play Console / Apple Developer.
- No hay evidencia visual desktop/mobile de landing, registro, PWA y flujos clave.

## Brechas P2

- Falta homogeneizar textos de confianza comercial para evitar promesas absolutas de cumplimiento.
- Falta inventario de procesadores y DPA.
- Falta matriz de retencion por categoria de dato.
- Falta metadata OpenGraph para campanas comerciales.

## Referencia sinkroniq-mobile usada

Se revisaron patrones de `sinkroniq-mobile` para launch Android/iOS, smoke PWA, gates de assets, reportes LOPDP y listas de bloqueos externos. No se copian textos ni flujos de facturacion electronica; se toma solo el patron operativo de control de release.

## Archivos runtime permitidos para fases siguientes

- `frontend-web/src/pages/Landing.jsx`
- `frontend-web/src/pages/LegalText.jsx`
- `frontend-web/src/pages/Register.jsx`
- `frontend-web/src/pages/Login.jsx`
- `frontend-web/src/pages/ForgotPassword.jsx`
- `frontend-web/src/pages/Planes.jsx`
- `frontend-web/src/App.jsx`
- `frontend-web/src/index.css`
- `frontend-web/pwa.config.js`
- `frontend-web/vite.config.js`
- `frontend-web/package.json`
- `frontend-web/package-lock.json`
- `frontend-web/public/*`
- `app-movil/package.json`
- `app-movil/package-lock.json`
- `app-movil/app.json`
- `app-movil/app.config.js`
- `app-movil/src/App.js`
- `app-movil/src/screens/*`
- `app-movil/src/services/*`
- `app-movil/assets/*`

## Criterio de salida

- P0 documentados y listos para LPA26-02..05.
- No se modifico runtime.
- AuditLock LPA26-00 validado con firma OK.

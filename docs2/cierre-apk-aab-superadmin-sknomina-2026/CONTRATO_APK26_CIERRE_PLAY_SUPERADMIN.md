# CONTRATO APK26 - Cierre Play Store y Superadmin

## Contrato mobile

- `app-movil/app.json` debe tener `expo.description` y `expo.extra.androidPrivacyPolicyUrl`.
- No usar `expo.android.privacyPolicyUrl`: Expo Doctor lo rechaza como propiedad no soportada.
- El chequeo de tienda debe validar metadatos, URLs HTTPS, identificadores y assets requeridos.
- El target Android se valida contra la matriz oficial de Expo SDK vigente; no se sobreescribe con valores
  manuales no soportados por Expo.
- La app movil debe consumir `/mobile/me` despues de autenticar y separar experiencia:
  empleado operativo, owner/admin RRHH administrativo y roles sin operacion movil directa.

## Contrato superadmin

- `/dashboard/superadmin` debe ser una consola fundador propia.
- Debe consumir `/api/superadmin/overview` y permitir seguimiento de incidencias.
- La gestion de planes sigue disponible, pero no debe ser la unica vista del fundador.
- El usuario cliente no debe ver la consola fundador.

## Contrato legal

- `validado_oficial` sigue siendo el unico estado que desbloquea calculos productivos cuando
  `REQUIRE_VALIDATED_LEGAL_PARAMETERS=true` o `NODE_ENV=production`.
- Los parametros confirmados pueden declarar campos validados y campos pendientes, sin degradar el guard.

## Contrato de gobierno repo

- `docs2/` y `.vscode/AuditLock.json` permanecen por trazabilidad Haiky.
- Anexos locales, privados, binarios bancarios o evidencias sensibles futuras deben quedar ignorados.
- Ningun secreto, certificado, token, URL privada o credencial debe guardarse en estos artefactos.

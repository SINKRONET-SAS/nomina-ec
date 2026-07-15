# AIV28-04 - Mobile: seguridad y uploads

## Plan
HAIKY-AUDITORIA-INTEGRAL-V28-NOMINA-EC-2026

## Objetivo
Corregir hallazgos H-11 (SQLite sin cifrado), H-12 (base64 en RAM) y H-13 (GPS sin validacion).

## Tareas

1. **H-11**: Evaluar cifrado SQLite:
   - Los datos en SQLite son operativos (cola offline, gastos movilizacion, cache rutas).
   - NO contienen cedulas, cuentas bancarias ni salarios.
   - Tokens ya estan en expo-secure-store (cifrado OS).
   - Evaluar si el riesgo justifica agregar dependencia nativa (`react-native-quick-crypto`).
   - Si no se justifica, documentar decision con mitigaciones existentes.

2. **H-12**: Migrar upload de permisos a FormData:
   - En `PermisosScreen.js`, reemplazar lectura base64 por FormData multipart.
   - El backend debe aceptar `multipart/form-data` en el endpoint de permisos.
   - Verificar que el limite de 3MB se mantiene.

3. **H-13**: Validar coordenadas GPS:
   - En `OperacionMovilScreen.js`, agregar validacion lat [-90,90] y lng [-180,180].
   - Mostrar Alert si las coordenadas son invalidas.

4. Verificar compatibilidad Expo SDK 57:
   - Confirmar que todas las dependencias son compatibles.
   - Ejecutar `npx expo export --platform android` como validacion.

## Criterios de aceptacion

- Upload de permisos usa FormData (no base64 en RAM).
- Coordenadas GPS validadas antes de enviar.
- Decision sobre cifrado SQLite documentada.
- Build mobile exitoso.
- RULES.md: zero silent failures, zero regresiones.

## Archivos afectados

- `app-movil/src/screens/PermisosScreen.js`
- `app-movil/src/screens/OperacionMovilScreen.js`
- `app-movil/src/db/offline-queue.js` (documentacion)

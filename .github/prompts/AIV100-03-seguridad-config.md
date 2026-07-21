# AIV100-03: Seguridad y Configuración

**Plan:** HAIKY-AUDITORIA-INTEGRAL-V100-SKNOMINA-2026
**Fase:** AIV100-03
**Estado:** pending

## Objetivo

Corregir hallazgos de seguridad y configuración.

## Hallazgos a corregir

| ID | Tipo | Archivo | Descripción |
|---|---|---|---|
| C-01 | Seguridad | app-movil/.env:4 | EXPO_TOKEN expuesto |
| A-05 | Bug | frontend-web/pwa.config.js:115 | Cache name "nosknomina-shell" |
| A-09 | Seguridad | backend/scripts/seed-superadmin-owner.js | Password complexity débil |

## Scripts

```bash
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-C01-remove-expo-token.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A05-fix-pwa-cache-name.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A09-seed-password-complexity.js
```

## Acciones manuales requeridas

1. **EXPO_TOKEN**: Después de ejecutar C-01, rotar el token en https://expo.dev/accounts/settings
2. **A-09**: Aplicar parche de validación manualmente en seed script
3. Verificar .gitignore incluye .env en app-movil/

## Verificación

- Confirmar .env limpio sin token real
- Confirmar cache name corregido en pwa.config.js
- PWA build debe funcionar con nuevo cache name

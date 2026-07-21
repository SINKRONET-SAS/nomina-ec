# AIV100-01: Ortografía y UTF-8

**Plan:** HAIKY-AUDITORIA-INTEGRAL-V100-SKNOMINA-2026
**Fase:** AIV100-01
**Estado:** pending

## Objetivo

Corregir errores ortográficos en texto visible al usuario y verificar encoding UTF-8.

## Hallazgos a corregir

| ID | Archivo | Error | Corrección |
|---|---|---|---|
| C-02 | frontend-web/src/pages/NotFound.jsx:13 | "pagina" | "página" |
| A-06 | frontend-web/src/pages/Dashboard.jsx:464 | "sesion" | "sesión" |
| A-07 | frontend-web/src/pages/PrivacidadCuenta.jsx:53 | "aqui" | "aquí" |
| A-08 | app-movil/src/screens/OperacionMovilScreen.js:155,187 | "invalidas" | "inválidas" |
| B-12 | frontend-web/src/utils/money.js:3 | "Extraido" | "Extraído" |

## Scripts

```bash
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-C02-ortografia-notfound.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A06-ortografia-dashboard.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A07-ortografia-privacidad.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-A08-ortografia-mobile-coordenadas.js
node docs2/auditoria-integral-v100-sknomina-2026/scripts/fix-B12-ortografia-money.js
```

## Verificación

- Ejecutar cada script y verificar output "[COMPLETADO]"
- grep final para confirmar que no quedan ocurrencias sin corregir

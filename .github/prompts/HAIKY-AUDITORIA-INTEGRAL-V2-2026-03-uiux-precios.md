# HAIKY AIV2-03 - UI/UX y precios

Objetivo:
- Humanizar textos visibles sin cambiar contratos.
- Mejorar claridad de precios: mensualidad, contado anual, IVA y tasa nominal como insumo de calculo.
- Reducir chunk inicial sin romper rutas.
- Consolidar helpers duplicados de descarga.

Reglas:
- No crear landing nueva.
- No ocultar IVA.
- No mostrar "sin tasa nominal" como mensaje comercial.
- No usar capturas antiguas como evidencia visual actual.

Gates:
- `node node_modules/vite/bin/vite.js build` desde `frontend-web`
- Revisar que `/`, `/precios`, `/login` y `/dashboard` sigan rutables.

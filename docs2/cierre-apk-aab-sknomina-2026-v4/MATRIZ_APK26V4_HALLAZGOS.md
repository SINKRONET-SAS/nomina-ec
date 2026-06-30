# Matriz APK26V4

| ID | Severidad | Estado | Cierre |
|----|-----------|--------|--------|
| HAL-N1 | Critico | Cerrado | `app-movil/app.json` declara `android.targetSdkVersion: 35` y `check-store-readiness.mjs` falla si baja de 35. |
| HAL-N2 | Alto | Cerrado | `FacturacionFiscal.jsx` y `SaldosIniciales.jsx` importan `extractApiError` desde `publicApi.js`. |
| HAL-N3 | Medio | Cerrado controlado | Se retiran del tracking anexos PDF/PNG sensibles en `docs2`; `.gitignore` ya bloquea su retorno. |
| HAL-N4 | Bajo | Cerrado previo | `App.jsx` ya protege saldos iniciales con owner/admin_rrhh y facturacion con superadmin, igual que backend. |
| HAL-N5 | Bajo | Cerrado | `sourceStatus` queda `validado_parcial` con campos validados y pendientes separados. |
| INFO-FAC-TIMEOUT | Informativo | Documentado | `facturadorClient` expone `timeoutMs` en readiness; no cambia comportamiento de emision. |

## Facturacion fiscal

El flujo correcto se mantiene: pago aprobado -> cola de solicitud fiscal -> API HTTP server-to-server de SINKRONET FACTURADOR -> webhook firmado de vuelta. SKNOMINA registra estado y observabilidad; no calcula IVA, no genera XML, no firma XAdES y no habla con SRI.

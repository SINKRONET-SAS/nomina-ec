# DCF26-11 - Humanizacion UI/UX y estados visibles

## Estado

Completado en segunda pasada runtime.

## Objetivo cerrado

Se eliminaron interacciones fragiles del frontend web en flujos criticos de documentos, empleados, roles y reportes institucionales. Las pantallas ahora muestran estados visibles de exito/error/carga y usan una descarga controlada por helper comun.

## Cambios funcionales

| Area | Antes | Ahora |
|------|-------|-------|
| Contratos generados | `window.open` y `alert` | Banner de exito/error, boton deshabilitado durante descarga y helper `downloadUrl`. |
| Actas de finiquito | `window.open`, `alert` y texto mojibake | Banner de exito/error, boton deshabilitado durante descarga y texto limpio. |
| Terminacion laboral | `alert` en error y regreso a `/empleados` | Error accionable en pantalla y retorno correcto a `/dashboard/empleados`. |
| Roles de pago | `window.open` | Descarga controlada y mensajes en pantalla. |
| Reportes entidades | `window.open` | Descarga controlada para RDEP, SAE y archivo bancario. |

## Archivos modificados

- `frontend-web/src/utils/downloadUrl.js`
- `frontend-web/src/pages/Documentos/ContratosGenerados.jsx`
- `frontend-web/src/pages/Documentos/ActasFiniquito.jsx`
- `frontend-web/src/pages/Empleados/TerminarEmpleado.jsx`
- `frontend-web/src/pages/Nomina/RolesPagos.jsx`
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx`

## Gates ejecutados

| Gate | Resultado | Evidencia |
|------|-----------|-----------|
| Sin popups nativos web | PASS | `rg -n "alert\\(|confirm\\(|window\\.open" frontend-web\\src` sin coincidencias. |
| Build frontend/PWA | PASS | `npm.cmd run build` en `frontend-web`. |
| Diff check | PASS | `git diff --check` sin errores; solo avisos CRLF esperados en Windows. |
| Smoke visual | SKIPPED_TOOL_UNAVAILABLE | El controlador del navegador integrado no quedo disponible en esta sesion. |

## Riesgo residual cerrado o reducido

- Se cierra el hallazgo DCF26-F09 para frontend web: ya no quedan `alert`, `confirm` ni `window.open`.
- Queda como riesgo menor que descargas cross-origin dependan de la politica del navegador/servidor; el helper no oculta el error si el backend no entrega URL.
- La app movil puede seguir usando componentes nativos propios de React Native para errores de login; DCF26-11 cerro el frente web donde estaban los popups fragiles.

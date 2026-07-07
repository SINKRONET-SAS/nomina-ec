# Informe de diagnostico - Auditoria integral Haiky 2026

## Resultado ejecutivo

La revision local contra `origin/main` confirma que el sistema ya contiene buena parte de las capacidades solicitadas: landing/PWA, backend, app movil, PayPhone, comunicaciones, permisos, historial de empleado, rutas y movilizacion con SQLite. La brecha principal no era ausencia total de funcionalidad sino cierre operativo: errores silenciosos, cierre local de movilizacion sin envio garantizado y falta de un script integral reproducible.

## Cambios ejecutados

- `app-movil/src/screens/GastosMovilizacionScreen.js`: cierre mensual ahora envia pendientes al backend antes de bloquear el periodo local.
- `app-movil/src/screens/GastosMovilizacionScreen.js`: errores locales/backend se registran con estructura.
- `app-movil/src/screens/RutaHoyScreen.js`: cache local de rutas ya no falla en silencio.
- `backend/src/app.js`: health check PayPhone de arranque ya no oculta fallos.
- `app-movil/app.json` y `scripts/verify-system-contracts.mjs`: el contrato raiz valida splash via plugin `expo-splash-screen`, compatible con SDK 57, y prohibe `expo.notification` legacy.
- `scripts/haiky-integral-diagnostic.mjs`: diagnostico integral reproducible.
- `scripts/haiky-integral-solution.mjs`: solucion/gate con `AuditLock.json`.

## Legal y proteccion de datos

LOPDP: existen consentimientos versionados (`ConsentPreference`), pantalla de privacidad, exportacion/anonimizacion y auditoria. Riesgo residual: la foto/GPS de marcacion y soportes medicos de permisos deben mantenerse bajo finalidad explicita, retencion definida y acceso minimo por rol. No se reporta incumplimiento definitivo sin revision juridica externa; se deja como control a validar.

Laboral/tributario Ecuador: existen parametros legales versionados, reportes RDEP/Formulario 107/SAE, roles de pago y periodos. Riesgo residual: todo cambio anual debe depender de fuente oficial vigente y bloqueo visible si falta validacion oficial.

## Monetizacion, pagos y email

PayPhone existe con modo real/sandbox/mock y gate. El modo mock no se elimina porque sirve para desarrollo; se mantiene como candidato de vigilancia para impedir uso productivo silencioso.

Email existe con servicio y auditoria de eventos. Riesgo residual: credenciales SMTP reales, DKIM/SPF/DMARC y politicas de retencion dependen de entorno productivo.

## Candidatos a eliminacion

No se elimino codigo en esta fase. Candidatos solo tras nueva evidencia:

- Modos mock de pago/almacenamiento: conservar si estan bloqueados en produccion; eliminar solo si se reemplazan por fixtures de test aisladas.
- Prompts/documentos historicos con patrones de mojibake: conservar si son centinelas de auditoria; no mezclarlos con runtime.

## Evidencia

- `docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_JSON.json`.
- `docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_AUTOMATIZADO.md`.
- `AuditLock.json` firmado.

# Plan Haiky - Auditoria integral Nomina EC 2026

## Alcance

Auditoria integral sobre LANDING, PWA, BACKEND y APP-MOVIL para Nomina EC en `SINKRONET-SAS/nomina-ec`, con foco en proteccion de datos personales, funcionalidad real, UI/UX, UTF-8, homologacion Guayaquil/Ecuador, monetizacion, pagos, email, reportes de nomina, rutas, movilizacion, permisos, autoservicio del empleado y entorno superadmin.

## Diagnostico confirmado 2026-07-07

Base local y remota: `main` esta alineada con `origin/main` en commit `cf196a4`.

Capacidades confirmadas por codigo:

- SQLite movilizacion local: `app-movil/package.json` declara `expo-sqlite` y `app-movil/src/db/movilizacion.js` persiste gastos por periodo.
- Flujo movilizacion backend/PWA: `backend/src/controllers/movilizacionController.js` recibe, lista y resuelve informes; `frontend-web/src/pages/Operacion/MovilizacionAprobacion.jsx` expone aprobacion.
- Historial y autoservicio empleado: `frontend-web/src/pages/Empleados/HistorialEmpleado.jsx`, `frontend-web/src/pages/Dashboard.jsx` y `app-movil/src/screens/AutoservicioScreen.js`.
- Permisos: `app-movil/src/screens/PermisosScreen.js` y `frontend-web/src/pages/Operacion/PermisosOperacion.jsx`.
- Pagos PayPhone: `backend/src/services/payphoneGatewayService.js`, `backend/src/controllers/paymentController.js`, `frontend-web/src/pages/Planes.jsx` y `frontend-web/src/pages/PaymentResult.jsx`.
- Email/notificaciones: `backend/src/services/communicationService.js`, auditoria `communication_events` y UI `frontend-web/src/pages/Configuracion/Comunicaciones.jsx`.

Hallazgos confirmados y tratados en esta ejecucion:

| ID | Severidad | Estado | Hallazgo | Evidencia | Solucion aplicada |
|----|-----------|--------|----------|-----------|-------------------|
| AISK26-ZSF-01 | Alta | Cerrado | `catch(() => {})` silencioso en app movil y backend. | `app-movil/src/screens/GastosMovilizacionScreen.js`, `app-movil/src/screens/RutaHoyScreen.js`, `backend/src/app.js`. | Logs estructurados con `code`, `statusCode`, `correlationId`, `userId` cuando aplica. |
| AISK26-MOV-01 | Alta | Cerrado | Cierre mensual de movilizacion bloqueaba periodo local sin exigir envio backend exitoso. | `GastosMovilizacionScreen.confirmarCierre`. | `confirmarCierre` ahora llama `enviarPendientes()` antes de `cerrarPeriodo()`. |
| AISK26-EXP-01 | Media | Cerrado | Contrato de Expo exigia `splash` legacy, pero el check movil SDK 57 lo prohibe. | `scripts/verify-system-contracts.mjs` y `app-movil/scripts/check-store-readiness.mjs`. | El contrato raiz ahora valida `expo-splash-screen`; `app-movil/app.json` mantiene `notification.icon`. |
| AISK26-GOV-01 | Media | Cerrado | No existia script unico de diagnostico integral reproducible. | Ausencia de script dedicado. | `scripts/haiky-integral-diagnostic.mjs` y `scripts/haiky-integral-solution.mjs`. |

Hallazgos candidatos reconfirmados como no cerrables automaticamente:

| ID | Severidad | Estado | Candidato | Criterio de no falso positivo |
|----|-----------|--------|-----------|-------------------------------|
| AISK26-PAY-01 | Media | Vigilar | Modo `mock` PayPhone sigue visible en backend/PWA. | Existe como modo controlado y bloqueable, no como cobro ficticio silencioso. Debe mantenerse con gate fuerte en produccion. |
| AISK26-S3-01 | Media | Vigilar | `backend/src/config/s3.js` contiene modo local/mock. | Puede ser aceptable para desarrollo y pruebas si produccion exige proveedor real o almacenamiento local controlado. |
| AISK26-DOC-01 | Baja | Vigilar | Prompts/documentos historicos contienen cadenas de prueba de mojibake. | Son archivos centinela o historicos; runtime UTF-8 paso gate. |

## Fases

| Fase | Prompt | Objetivo | Cierre |
|------|--------|----------|--------|
| 00 | `HAIKY-AUDITORIA-INTEGRAL-2026-00-baseline.md` | Congelar baseline, ejecutar diagnostico y validar no divergencia remoto/local. | `AuditLock.json` firmado. |
| 01 | `HAIKY-AUDITORIA-INTEGRAL-2026-01-zero-silent-failures.md` | Eliminar errores silenciosos y asegurar logs estructurados. | `npm.cmd run haiky:solution`. |
| 02 | `HAIKY-AUDITORIA-INTEGRAL-2026-02-movilizacion-sqlite-cierre.md` | Cerrar flujo movilizacion SQLite -> backend -> PWA aprobacion -> novedad anticipo. | Tests backend y gate movil. |
| 03 | `HAIKY-AUDITORIA-INTEGRAL-2026-03-lopdp-legal-pagos-email.md` | Revisar LOPDP, consentimiento, PayPhone, email, roles y superadmin sin reportar falsos positivos. | Informe legal/tecnico actualizado. |
| 04 | `HAIKY-AUDITORIA-INTEGRAL-2026-04-reportes-uiux-humanizacion.md` | Reportes nomina/rutas, ortografia, UI/UX y humanizacion sin romper contratos. | Build web y contratos. |
| 05 | `HAIKY-AUDITORIA-INTEGRAL-2026-05-qa-release.md` | QA final, candidatos a eliminacion justificados, commit y push. | `validate`, `AuditLock.json`, commit con `phase` y `task`. |

## Gates ejecutados

- `npm.cmd run haiky:solution`: PASS.
- `npm.cmd run check:mobile`: PASS tras homologar contrato SDK 57.
- `node scripts/verify-system-contracts.mjs`: PASS dentro del gate.
- Gate anti `catch` silencioso runtime: PASS.
- Gate UTF-8 runtime: PASS.

## Scripts JS de solucion

- `scripts/haiky-integral-diagnostic.mjs`: genera `docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_JSON.json` y `DIAGNOSTICO_AUTOMATIZADO.md`.
- `scripts/haiky-integral-solution.mjs`: ejecuta diagnostico, contratos, gate anti silent failures, gate UTF-8 y firma `AuditLock.json`.

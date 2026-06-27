# Matriz CDANV2 - Hallazgos Auditoria Nomina-Ec 2026 V2

| ID | Prioridad | Estado final | Area | Hallazgo | Riesgo | Fase | Evidencia de cierre |
|----|-----------|--------------|------|----------|--------|------|---------------------|
| SEC-V2-01 | FP controlado | closed_fp | Legal SBU | Auditoria propone SBU 2026 USD 470. | Recalculo ilegal si se baja el SBU sin fuente vigente. | CDANV2-01 | Se mantiene USD 482; no se alteran parametros legales sin fuente oficial versionada. |
| SEC-V2-02 | P0 | closed_runtime | Auth | Query a BD por cada request autenticado. | Cuello de botella y saturacion de conexiones. | CDANV2-02 | `auth.js` usa claims firmados y conserva `requireFreshUser`; pruebas verdes. |
| SEC-V2-03 | P1 | closed_previo | Comunicaciones | Fallos de notificacion de rol pueden no ser operables. | Cierre exitoso sin aviso a empleados. | CDANV2-07 | `sendRolPagoDisponible()` existe, registra fallos y alimenta eventos minimizados. |
| SEC-V2-04 | P0 | closed_previo | Superadmin | Panel o rutas superadmin pueden quedar 404/vacias. | Revenue y soporte sin operacion. | CDANV2-03 | `/api/superadmin/*`, `PlanesGestion.jsx` y `superadminApi.js` existen y consumen backend real. |
| SEC-V2-05 | P0 | closed_previo | Roles PDF | Boton Descargar PDF puede devolver 500/404. | Core de producto roto. | CDANV2-04 | Rol individual y PDF general usan `payrollRolePdfService`; pruebas existentes cubren endpoints. |
| SEED-V2-01 | P0 | closed_previo | Deploy | Despliegue nuevo sin primer superadmin. | Onboarding productivo bloqueado. | CDANV2-03 | `backend/scripts/seed-superadmin-owner.js` y `npm run seed:admins` son idempotentes por variables de entorno. |
| MON-V2-01 | P0 | closed_previo | Revenue | Webhook Stripe ausente o no operativo. | Planes no se activan tras pago. | CDANV2-06 | Stripe queda bloqueado visible si no esta completo; PayPhone real se preserva. |
| BUG-V2-03 | P0 | closed_runtime | Nomina | `cerrarMes()` sin bloqueo de carrera. | Doble cierre o doble notificacion. | CDANV2-05 | `cerrarMes()` usa cliente transaccional y `SELECT ... FOR UPDATE`; pruebas verdes. |
| LEG-V2-05 | P1 | closed_runtime | LOPDP | Auditoria de comunicaciones sin TTL/purga. | Retencion excesiva de datos personales. | CDANV2-07 | Se agrego purga `privacy:purge-communications` y prueba de eliminacion por `retention_until`. |
| REP-V2-01 | P1 | closed_previo | Reportes | Consolidado o detalle pueden apuntar a endpoints legacy. | Reporteria de nomina incompleta. | CDANV2-04 | PWA usa endpoints reales de roles PDF y reportes de entidades; archivo bancario vive en pagos. |
| UX-V2-01 | P2 | closed_runtime | UX | Estados tecnicos poco claros en roles. | Operacion confusa. | CDANV2-07 | Boton visible renombrado a `PDF general` y mensajes humanizados. |
| UX-V2-02 | P2 | closed_runtime | Mobile | Montos no formateados en USD Ecuador. | Lectura deficiente para empleados. | CDANV2-07 | Autoservicio movil usa `Intl.NumberFormat('es-EC', { currency: 'USD' })`. |
| LEG-V2-01 | P2 | closed_runtime | Mensajes | Mensajes sin tildes o tecnicos. | Percepcion no profesional. | CDANV2-07 | Se mantienen textos comerciales en Roles y pagos; no se exponen errores tecnicos al usuario. |
| DUP-V2-02 | P2 | closed_previo | Frontend | Selector de periodo duplicado. | Regresiones de timezone. | CDANV2-07 | Pantallas criticas usan periodo Ecuador validado por contratos existentes. |
| ELIM-V2-01 | P2 | closed_fp | Docs | Auditoria sugiere eliminar `docs2`. | Perder gobierno Haiky activo. | CDANV2-01 | `docs2` se conserva como gobierno activo del plan. |
| ELIM-V2-02 | P2 | closed_local_gate | CI | Tests podrian no ejecutarse en pipeline. | Regresiones no detectadas. | CDANV2-08 | Gates locales documentados y ejecutados antes del release. |

## Confirmado como correcto hasta nueva evidencia

- SBU 2026 operativo: USD 482.
- `CODEX_CONTEXT.md` no debe vivir en raiz.
- `docs2` no es duplicado eliminable: contiene gobierno activo de planes Haiky.
- PayPhone es canal real existente y no debe romperse al evaluar Stripe.

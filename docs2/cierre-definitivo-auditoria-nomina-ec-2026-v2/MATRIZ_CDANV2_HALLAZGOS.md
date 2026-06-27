# Matriz CDANV2 - Hallazgos Auditoria Nomina-Ec 2026 V2

| ID | Prioridad | Estado inicial | Area | Hallazgo | Riesgo | Fase | Criterio de cierre |
|----|-----------|----------------|------|----------|--------|------|--------------------|
| SEC-V2-01 | FP controlado | refutado | Legal SBU | Auditoria propone SBU 2026 USD 470. | Recalculo ilegal si se baja el SBU sin fuente vigente. | CDANV2-01 | Mantener USD 482 salvo fuente oficial versionada que indique otro valor. |
| SEC-V2-02 | P0 | verificar_runtime | Auth | Query a BD por cada request autenticado. | Cuello de botella y saturacion de conexiones. | CDANV2-02 | JWT con claims, middleware fresh-user para operaciones criticas y pruebas. |
| SEC-V2-03 | P1 | verificar_runtime | Comunicaciones | Fallos de notificacion de rol pueden no ser operables. | Cierre exitoso sin aviso a empleados. | CDANV2-07 | Fallos auditados, visibles y reintentables si aplica. |
| SEC-V2-04 | P0 | verificar_runtime | Superadmin | Panel o rutas superadmin pueden quedar 404/vacias. | Revenue y soporte sin operacion. | CDANV2-03 | Rutas/pantallas superadmin funcionales o bloqueo visible. |
| SEC-V2-05 | P0 | verificar_runtime | Roles PDF | Boton Descargar PDF puede devolver 500/404. | Core de producto roto. | CDANV2-04 | Rol individual descarga archivo real y prueba automatizada. |
| SEED-V2-01 | P0 | verificar_runtime | Deploy | Despliegue nuevo sin primer superadmin. | Onboarding productivo bloqueado. | CDANV2-03 | Seed seguro por variables, idempotente, sin credenciales hardcodeadas. |
| MON-V2-01 | P0 | verificar_runtime | Revenue | Webhook Stripe ausente o no operativo. | Planes no se activan tras pago. | CDANV2-06 | Stripe real con webhook firmado o bloqueo visible; PayPhone preservado. |
| BUG-V2-03 | P0 | verificar_runtime | Nomina | `cerrarMes()` sin bloqueo de carrera. | Doble cierre o doble notificacion. | CDANV2-05 | Lock transaccional, idempotencia y pruebas concurrentes. |
| LEG-V2-05 | P1 | verificar_runtime | LOPDP | Auditoria de comunicaciones sin TTL/purga. | Retencion excesiva de datos personales. | CDANV2-07 | Politica de retencion, minimizacion y purga auditable. |
| REP-V2-01 | P1 | verificar_runtime | Reportes | Consolidado o detalle pueden apuntar a endpoints legacy. | Reporteria de nomina incompleta. | CDANV2-04 | Botones visibles consumen endpoints reales existentes. |
| UX-V2-01 | P2 | verificar_runtime | UX | Estados tecnicos poco claros en roles. | Operacion confusa. | CDANV2-07 | Badges y mensajes humanos sin romper tablas. |
| UX-V2-02 | P2 | verificar_runtime | Mobile | Montos no formateados en USD Ecuador. | Lectura deficiente para empleados. | CDANV2-07 | `Intl.NumberFormat('es-EC', 'USD')` o helper existente. |
| LEG-V2-01 | P2 | verificar_runtime | Mensajes | Mensajes sin tildes o tecnicos. | Percepcion no profesional. | CDANV2-07 | Correcciones UTF-8 sin mojibake y build verde. |
| DUP-V2-02 | P2 | verificar_runtime | Frontend | Selector de periodo duplicado. | Regresiones de timezone. | CDANV2-07 | Reusar helper/hook existente sin duplicar logica. |
| ELIM-V2-01 | P2 | descartado_plan | Docs | Auditoria sugiere eliminar `docs2`. | Perder gobierno Haiky activo. | CDANV2-01 | No eliminar `docs2`; es fuente activa del plan. |
| ELIM-V2-02 | P2 | verificar_runtime | CI | Tests podrian no ejecutarse en pipeline. | Regresiones no detectadas. | CDANV2-08 | Confirmar CI o documentar gate local obligatorio. |

## Confirmado como correcto hasta nueva evidencia

- SBU 2026 operativo: USD 482.
- `CODEX_CONTEXT.md` no debe vivir en raiz.
- `docs2` no es duplicado eliminable: contiene gobierno activo de planes Haiky.
- PayPhone es canal real existente y no debe romperse al evaluar Stripe.

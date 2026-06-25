# Matriz ANV1 - Hallazgos Auditoria Nomina-Ec 2026 V1

Fuente: `AuditoriaNominaEC2026V1.jsx` y `nominaec_v1_data.jsx`.

Nota de gobierno: esta matriz prioriza los hallazgos indicados por el usuario y agrega los hallazgos adicionales encontrados en la fuente para que no queden fuera del cierre. La validez legal exacta de articulos y periodos debe confirmarse en ANV1-01 con fuente oficial y revision profesional antes de produccion.

| ID auditoria | Prioridad | Estado | Area | Evidencia fuente | Riesgo | Fase cierre | Criterio de aceptacion |
|--------------|-----------|--------|------|------------------|--------|-------------|------------------------|
| SEC-C01 | P0 | confirmado_fuente | Seguridad repo | `CODEX_CONTEXT.md` en raiz publica. | Exposicion de arquitectura, flujo de nomina y contexto superadmin. | ANV1-02 | Contexto interno reubicado o minimizado, referencias actualizadas, sin romper Codex. |
| SEC-C03 | P0 | confirmado_fuente | Seguridad repo | `render.yaml` con `plan_haiky` y `haiky_migration`. | Naming interno y usuario DB visibles. | ANV1-02 | Plan seguro de renombre/rotacion; sin romper Render ni DB existente. |
| BRAND-C01 | P0 | confirmado_fuente | Branding | `PLAN HAIKY` en codigo/logs/comentarios. | Confusion comercial y exposicion de metodologia interna. | ANV1-02 | Runtime publico usa Nomina-Ec; Haiky queda solo en docs internas. |
| LEG-C02 | P0 | confirmado_fuente | Nomina legal | Horas extra 50/100 sin validacion suficiente. | Pago incorrecto, reclamos laborales y multas. | ANV1-03 | Validacion semanal/tipo dia/recargo con errores visibles y pruebas. |
| LEG-C03 | P0 | confirmado_fuente | Nomina legal | D13/D14 sin periodo legal correcto segun auditoria. | Diferencias de beneficios sociales. | ANV1-03 | Periodos, region y snapshots implementados sin recalculo historico inseguro. |
| LEG-H01 | P0 | confirmado_fuente | IESS | Aportes sin condicion por afiliacion/tipo relacion. | Aportes incorrectos. | ANV1-03 | Modelo y calculo distinguen afiliacion, relacion laboral y excepciones. |
| SEC-H01 | P0 | confirmado_fuente | Seguridad/LOPDP | Listado empleados expone sueldo/gastos. | Acceso excesivo a datos sensibles. | ANV1-04 | Proyecciones por rol, minimizacion y pruebas RBAC. |
| LEG-H02 | P0 | confirmado_fuente | LOPDP | Sin audit log de lectura de datos personales. | Incumplimiento de trazabilidad. | ANV1-04 | Auditoria de lectura para datos salariales/personales con correlationId. |
| MON-C01 | P0 | confirmado_fuente | Monetizacion | PayPhone en mock. | No se cobra dinero real aunque landing vende planes. | ANV1-05 | Gate de produccion, bloqueo visible si mock, pruebas de configuracion. |
| MON-H01 | P1 | confirmado_fuente | Monetizacion | Precios landing hardcodeados y sin IVA claro. | Promesa comercial inconsistente. | ANV1-05 | Precios desde configuracion/planes o contrato estatico validado, IVA visible. |
| SADM-C01 | P0 | confirmado_fuente | Superadmin | `Superadmin.jsx` ausente segun auditoria. | Gestion solo backend/DB. | ANV1-06 | Pantalla/ruta PWA protegida para superadmin con datos reales. |
| SADM-H01 | P1 | confirmado_fuente | Superadmin legal | Parametros legales sin UI superadmin. | Parametros productivos manipulados por DB. | ANV1-06 | UI/API de parametros con vigencia, fuente, auditoria y bloqueo. |
| HUM-H01 | P2 | confirmado_fuente | Mobile UX | Texto `asistencia movil` sin tilde. | Calidad percibida baja. | ANV1-07 | Textos visibles revisados y build mobile pasa. |
| HUM-H02 | P2 | confirmado_fuente | Web UX | Textos web sin tildes. | Calidad percibida baja. | ANV1-07 | Textos visibles corregidos sin regresion visual. |
| HUM-M01 | P2 | confirmado_fuente | Mobile | App con paridad limitada. | Promesa mobile incompleta. | ANV1-07 | Priorizacion de rol/documentos/permisos o bloqueo comercial visible. |
| DUP-H01 | P2 | confirmado_fuente | Deuda | `money()` duplicado. | Inconsistencia de formato. | ANV1-07 | Utilidad centralizada en scope acotado. |
| DUP-M01 | P2 | confirmado_fuente | Arquitectura | Prisma + `pg` directo. | Deuda e inconsistencia tipada. | ANV1-07 | Contrato de arquitectura; migracion gradual, no refactor masivo. |
| GAP-H01 | P1 | confirmado_fuente | Suscripciones | Sin cron vencimientos. | Suscripciones vencidas activas. | ANV1-05 | Cron idempotente, dunning y evidencia. |
| GAP-H02 | P0 | confirmado_fuente | Datos bancarios | Cuenta bancaria potencialmente texto plano. | Exposicion financiera. | ANV1-07 | Verificacion cifrado real y migracion si aplica. |
| SEC-C02 | P1 | confirmado_fuente | Arquitectura/seguridad | `SELECT *` y `pg` directo. | Exceso de datos y deuda. | ANV1-04/07 | Proyecciones minimizadas; migracion Prisma solo por fase aprobada. |

## Dependencias criticas

- ANV1-02 debe ejecutarse antes de cualquier release publico si se confirma exposicion sensible.
- ANV1-03 debe ejecutarse antes de ofrecer exactitud legal de beneficios sociales.
- ANV1-04 debe ejecutarse antes de ampliar dashboards o reportes con datos salariales.
- ANV1-05 debe ejecutarse antes de campanas comerciales con cobro real.
- ANV1-06 debe ejecutarse antes de delegar operacion a superadmin sin acceso DB.

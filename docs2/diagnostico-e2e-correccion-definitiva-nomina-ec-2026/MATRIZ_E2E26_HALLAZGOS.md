# Matriz E2E26 - Hallazgos Diagnostico E2E Nomina-Ec 2026

| ID | Prioridad | Area | Hallazgo | Impacto | Criterio de cierre | Fase |
|----|-----------|------|----------|---------|--------------------|------|
| E2E26-H01 | P0 | Registro | El registro devuelve token y permite continuar aunque el correo quede pendiente de verificacion. | Operacion sensible sin identidad confirmada. | Operaciones sensibles bloquean si `email_verificado_en` falta, con pantalla de accion. | E2E26-01 |
| E2E26-H02 | P0 | Tenant | Consentimiento LOPDP queda capturado, pero no gobierna operaciones posteriores. | Riesgo legal y falsa sensacion de cumplimiento. | Estado operacional valida consentimiento/version antes de nomina, app y comunicaciones. | E2E26-01 |
| E2E26-H03 | P0 | Onboarding | No hay checklist minimo obligatorio antes de permitir nomina. | Calculo/cierre con parametros, jornada, unidad, zona o periodo incompletos. | Gate de tenant bloquea calculo/cierre hasta completar requisitos. | E2E26-01 |
| E2E26-H04 | P0 | Identidad | Login busca por email global y toma el usuario mas reciente. | Ambiguedad si un correo existe en mas de un tenant. | Login tenant-aware o bloqueo explicito de duplicidad para roles operativos. | E2E26-02 |
| E2E26-H05 | P1 | Empleados | `cedula` es unica global. | Una persona no puede trabajar en dos tenants del SaaS. | Unicidad revisada por tenant o excepcion documentada y visible. | E2E26-03 |
| E2E26-H06 | P0 | Seguridad datos | Cuenta bancaria cifrada tiene fallback `change-this-local-bank-key`. | Riesgo de cifrado debil o recuperacion insegura. | Clave bancaria obligatoria fuera del repo y arranque fail-closed si falta en ambientes no demo. | E2E26-03 |
| E2E26-H07 | P1 | Documentos | Error al generar contrato automatico se captura y solo se loguea. | Empleado puede quedar operativo sin documento laboral. | Estado de documento visible; bloqueo o advertencia fuerte segun politica. | E2E26-03 |
| E2E26-H08 | P0 | Auditoria laboral | Cambios de sueldo, jornada, contrato, unidad o fecha ingreso no evidencian auditoria especifica. | Riesgo legal/laboral y trazabilidad insuficiente. | Audit log con valor anterior/nuevo, usuario, fecha, correlationId y motivo. | E2E26-03 |
| E2E26-H09 | P1 | Invitaciones app | Invitaciones pueden quedar pendientes/vencidas sin expiracion operacional visible. | RRHH no sabe que empleados no activaron app. | Expiracion automatica, dashboard de estados y acciones de reenvio/revocacion. | E2E26-04 |
| E2E26-H10 | P0 | App movil | README promete foto + GPS obligatorio, pero la app revisada no usa foto obligatoria. | Promesa funcional falsa y posible incumplimiento comercial. | Implementar foto con base LOPDP o ajustar README/landing/app para no prometerla. | E2E26-05 |
| E2E26-H11 | P1 | App movil | Backend soporta almuerzo, pero UI movil solo expone inicio/fin jornada. | Proceso incompleto si clientes esperan pausas. | Exponer inicio/fin almuerzo o documentar que no forma parte del alcance activo. | E2E26-05 |
| E2E26-H12 | P1 | Novedades | Unicidad empleado+fecha+tipo puede impedir dos novedades justificadas el mismo dia. | Casos reales de asistencia quedan sin modelar. | Granularidad horaria/lote o regla explicita de consolidacion. | E2E26-06 |
| E2E26-H13 | P0 | Calculo | El controlador de calculo no verifica explicitamente que el periodo este abierto. | Recalculo en estado indebido. | Calculo solo en estados permitidos y con error estructurado si no aplica. | E2E26-07 |
| E2E26-H14 | P0 | Calculo | El periodo podria quedar `calculated` aunque existan empleados con error. | Cierre incompleto o pago incorrecto. | Estado `calculation_failed` y bloqueo de cierre si cualquier empleado falla. | E2E26-07 |
| E2E26-H15 | P0 | Cierre | README declara nomina cerrada inmutable, pero existe reapertura. | Promesa falsa o confusion operativa. | Copy y modelo conceptual corregidos: reapertura controlada con auditoria/reverso. | E2E26-08 |
| E2E26-H16 | P0 | Beneficios | Reapertura no revierte descuentos de beneficios aplicados en cierre. | Saldos inconsistentes al recalcular. | Reverso o evento de rectificacion antes de recalcular/cerrar. | E2E26-08 |
| E2E26-H17 | P1 | Roles PDF | No se observa generacion automatica de rol PDF al cerrar; movil devuelve resumen sin PDF/desglose. | Empleado no recibe evidencia completa del rol. | Cierre genera roles o registra bloqueo visible; movil/PWA permite consultar desglose/descarga. | E2E26-08 |
| E2E26-H18 | P1 | QA | Faltan scripts/gates E2E para diagnostico, pre-cierre, invitaciones y reapertura. | Regresiones silenciosas en flujo completo. | Scripts adaptados al schema real y ejecutados en release gate. | E2E26-09 |

## Priorizacion

- P0 inmediato: E2E26-H01, H02, H03, H04, H06, H08, H10, H13, H14, H15, H16.
- P1 operativo: invitaciones, documentos, cedula por tenant, almuerzo, novedades granularidad, roles PDF y scripts de soporte.
- P2 posterior: mejoras de presentacion y metricas si no bloquean el cierre operativo.

## Estado runtime 2026-06-22

| ID | Estado | Evidencia |
|----|--------|-----------|
| E2E26-H01 | Cerrado local | Prechequeo operativo bloquea calculo/cierre si no existe OWNER/RRHH con correo verificado. |
| E2E26-H02 | Parcial controlado | Consentimiento OWNER se conserva; bloqueo retroactivo total queda como riesgo legal para evitar dejar fuera tenants historicos. |
| E2E26-H03 | Cerrado local | `operationalReadinessService` bloquea calculo/cierre por empleados, parametros, periodo y novedades. |
| E2E26-H04 | Cerrado local | Login backend es tenant-aware y PWA/app movil aceptan RUC opcional. |
| E2E26-H05 | Cerrado local | Migracion `20260622164000_e2e26_employee_cedula_by_tenant`. |
| E2E26-H06 | Sin cambio en esta fase | Riesgo cubierto por DV3N26/AIV50; no se modifico cifrado bancario en E2E26. |
| E2E26-H07 | Sin cambio en esta fase | Documento laboral sigue como warning operativo/documental. |
| E2E26-H08 | Parcial controlado | Cambios de prechequeo y reapertura registran auditoria/resumen; auditoria campo a campo de empleado queda para fase especifica. |
| E2E26-H09 | Cerrado local | `expirePendingEmployeeInvites` actualiza invitaciones vencidas al listar/reenviar. |
| E2E26-H10 | Parcial controlado | Backend mantiene soporte `fotoBase64`; no se agrega camara en Expo Go. No activar promesa de foto obligatoria sin dependencia/app y base LOPDP. |
| E2E26-H11 | Cerrado local | App movil expone inicio/fin de almuerzo y backend valida secuencia. |
| E2E26-H12 | Sin cambio en esta fase | Regla de unicidad se conserva; requiere modelo horario si se habilitan multiples novedades mismo dia. |
| E2E26-H13 | Cerrado local | Calculo exige estado calculable mediante prechequeo. |
| E2E26-H14 | Cerrado local | Errores por empleado dejan `calculation_failed` y 422. |
| E2E26-H15 | Cerrado local | Reapertura se maneja como controlada y se registra en `summary`. |
| E2E26-H16 | Parcial controlado | Reapertura exige estado cerrado y motivo; reverso contable automatico queda como riesgo controlado. |
| E2E26-H17 | Parcial controlado | Preclose advierte roles PDF faltantes; generacion automatica productiva queda pendiente por almacenamiento/contrato. |
| E2E26-H18 | Parcial controlado | Gates ejecutados y reporte E2E26-09 generado; scripts standalone quedan absorbidos por servicio/precheck y runbook. |

Evidencia: `REPORTE_E2E26_09_CIERRE_RUNTIME.md`.

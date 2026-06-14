# Open Haiky Plan - HAIKY-OPERACION-NOMINA-EC-INTEGRAL-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-OPERACION-NOMINA-EC-INTEGRAL-2026 |
| Codigo | ONI26 |
| Estado | abierto en fase documental |
| Fase actual | ONI26-00 cerrada documentalmente |
| Alcance | mejora integral de sitio publico, onboarding, contabilidad, RDEP, SUPERADMIN, OWNER, bancos, usuarios/accesos, API, asistencia, seeds, apertura mensual, cargas masivas, reportes, dashboard, mensajes y QA end to end |
| Plan doc | `docs2/PLAN_HAIKY_OPERACION_NOMINA_EC_INTEGRAL_2026.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/OPERACION-NOMINA-EC-INTEGRAL-2026-{00..14}-*.md` |
| RULES | `RULES.md` |

## Resumen

ONI26 responde a la necesidad de convertir Nomina-Ec en una plataforma operacional completa para venta, configuracion, ejecucion mensual y control. El plan evita churn al separar diagnostico, producto publico, parametros contables, obligaciones RDEP, administracion SUPERADMIN, operacion OWNER, integraciones, asistencia, cargas, reportes, dashboard y QA con datos DEMO.

ONI26 no reemplaza los planes previos: toma como base LPA26 para landing/PWA/app stores/LOPDP y exige diagnostico antes de tocar runtime. No se deben crear pantallas paralelas ni flujos duplicados; se debe evolucionar lo existente.

## Reglas ONI26

- No tocar runtime antes de ONI26-01.
- No crear una segunda landing, segundo registro, segunda app o segundo modulo de parametrizacion.
- No implementar RDEP sin revisar ficha tecnica XSD/XML vigente y documentar fuente.
- No crear asientos contables sin mapeo parametrizable por tenant.
- No generar archivos bancarios sin ficha tecnica por banco, validaciones y evidencia.
- No exponer API externa sin versionado, autenticacion, limites, auditoria y contrato.
- No usar datos reales en smoke, capturas, seeds o reportes de demo.
- No prometer cumplimiento legal, tributario o laboral total sin evidencia y revision profesional.
- Cada fase requiere AuditLock firmado y commit `phase: ONI26-XX task: ...`.

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| ONI26-00 | P0 | completed | Baseline documental: plan, prompts, contexto y AuditLock; no toca runtime. |
| ONI26-01 | P0 | pending | Diagnostico integral anti-churn de sitio publico, app, nomina, parametrizacion, reportes, APIs y datos demo. |
| ONI26-02 | P0 | pending | Sitio publico: link, inicio, crear cuenta, propuesta de valor y recorrido comercial. |
| ONI26-03 | P0 | pending | Mapeo de parametros de nomina a cuentas contables y reglas por tenant. |
| ONI26-04 | P0 | pending | RDEP: ficha tecnica, XSD, XML, validaciones y evidencias de cumplimiento. |
| ONI26-05 | P0 | pending | Entorno SUPERADMIN: planes, addons, owners, contratos, incidencias y catalogos globales. |
| ONI26-06 | P0 | pending | Entorno OWNER: bancos, archivos planos por ficha tecnica, usuarios, roles y accesos. |
| ONI26-07 | P1 | pending | API publica/integracion: versionado, autenticacion, contratos, rate limits, auditoria y ejemplos. |
| ONI26-08 | P0 | pending | Asistencia: control manual, marcacion APP, novedades y trazabilidad. |
| ONI26-09 | P0 | pending | Seeds de parametros, empresa DEMO y datos smoke no reales. |
| ONI26-10 | P0 | pending | Apertura de mes y lote de novedades segun estructura organizativa. |
| ONI26-11 | P0 | pending | Carga masiva de empleados con validaciones, rollback y reporte de errores. |
| ONI26-12 | P0 | pending | Reportes de nomina, PDF, Excel tabular y exportaciones auditables. |
| ONI26-13 | P1 | pending | Dashboard mejorado: headcount, alertas operativas, avances y confianza ejecutiva. |
| ONI26-14 | P0 | pending | Humanizacion de mensajes tecnicos, QA end to end, datos smoke y release. |

## Entregables esperados por linea

- Diagnostico P0/P1/P2 antes de runtime.
- Backlog trazable por modulo.
- Contratos tecnicos para contabilidad, bancos, RDEP y API.
- Seeds y datos DEMO no reales.
- Pruebas end to end con smoke reproducible.
- Reportes de fase bajo `docs2/operacion-nomina-ec-integral-2026/`.

## Riesgos iniciales

- Fichas tecnicas RDEP, bancos y entidades publicas pueden cambiar y requieren fuente vigente.
- La integracion contable depende del plan de cuentas de cada tenant.
- El API externo requiere gobierno de seguridad antes de exponerlo.
- Cargas masivas y reportes pueden tocar datos personales; deben respetar LOPDP.
- SUPERADMIN no debe poder romper aislamiento tenant ni editar datos operativos sin auditoria.

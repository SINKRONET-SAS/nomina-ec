# HAIKY-MIGRACION-SALDOS-INICIALES-FACTURACION-SKNOMINA-2026

Codigo: `MSF26`  
Fecha: 2026-06-28  
Estado: `MSF26-01..08 ejecutadas localmente; QA verde`

## Fuentes

- Requerimiento usuario: carga de saldos iniciales para nuevos clientes y migracion eficiente a SKNOMINA.
- Requerimiento tributario: disparar factura desde SINKRONET FACTURADOR alojado en Render.
- Repo consultivo facturador: `C:\proyectos web\sinkroniq-mobile`.
- Facturador identificado: `app.json` declara `Sinkronet Facturador`; backend expone rutas `/api/facturas`, `/api/comprobantes`, `/api/secuenciales`, `/api/health` y servicios SRI.
- Reglas: `RULES.md`.
- Contexto operativo: `.github/CODEX_CONTEXT.md`.
- AuditLock: `.vscode/AuditLock.json`.

## Objetivo

Cerrar definitivamente dos brechas de incorporacion comercial:

1. Permitir que un nuevo cliente migre a SKNOMINA con saldos iniciales laborales, contables y de novedades sin recalcular ni contaminar periodos cerrados.
2. Cumplir la exigencia tributaria de facturacion de los servicios SKNOMINA usando SINKRONET FACTURADOR como motor fiscal externo, mediante API/rutina idempotente, auditable y visible en PWA.

## Alcance activo

| ID | Prioridad | Area | Cierre esperado |
|----|-----------|------|-----------------|
| MSF-R01 | P0 | Onboarding | Wizard PWA de migracion de saldos iniciales por cliente/tenant. |
| MSF-R02 | P0 | Datos | Staging de saldos con prevalidacion, errores por fila, aprobacion y reversa. |
| MSF-R03 | P0 | Nomina | Saldos de vacaciones, decimos, fondo de reserva, anticipos, prestamos, beneficios/descuentos y novedades iniciales quedan vinculados a periodo de corte. |
| MSF-R04 | P0 | Contabilidad | Saldos iniciales contables no se mezclan con roles calculados; se registran como lote de migracion. |
| MSF-R05 | P0 | Plantillas | Plantillas descargables CSV/XLSX con catalogos, reglas de formato y ejemplo DEMO. |
| MSF-R06 | P0 | Auditoria | Cada carga tiene lote, hash, usuario, fecha, dry-run, commit y rollback documentado. |
| MSF-R07 | P0 | Facturacion | SKNOMINA dispara factura fiscal al facturador por evento comercial facturable. |
| MSF-R08 | P0 | Integracion | Contrato API server-to-server con autenticacion, idempotencia, correlacion y webhooks. |
| MSF-R09 | P0 | Tributario | SKNOMINA no firma XML ni simula SRI; delega emision a SINKRONET FACTURADOR y guarda estado/referencia. |
| MSF-R10 | P0 | UX | PWA muestra estado de migracion, estado fiscal, ultimo intento, errores y siguiente accion. |

## Decisiones obligatorias

- No iniciar runtime sin aprobacion explicita por fase.
- No copiar secretos, tokens, URLs privadas, certificados ni credenciales desde `sinkroniq-mobile`.
- No emitir facturas reales desde fases documentales o diagnosticas.
- No migrar saldos contra clientes reales sin respaldo, dry-run exitoso, aprobacion OWNER y rollback documentado.
- SINKRONET FACTURADOR es el motor fiscal; SKNOMINA conserva solo solicitud, estado, clave/referencia autorizada, RIDE/XML si el facturador los devuelve por contrato y bitacora.
- Los saldos iniciales se registran por lote y periodo de corte; no alteran periodos cerrados ni recalculan nominas historicas.
- Todo bloqueo externo de facturacion, Render, SRI, certificado, plan o perfil fiscal debe quedar visible en frontend.

## Fases

| Fase | Prioridad | Estado | Objetivo |
|------|-----------|--------|----------|
| MSF26-00 | P0 | completed_documental | Crear plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| MSF26-01 | P0 | completed_local | Diagnosticar runtime SKNOMINA y SINKRONET FACTURADOR, rutas, modelos, pagos, planes y puntos de emision fiscal. |
| MSF26-02 | P0 | completed_local | Disenar modelo de datos de saldos iniciales, staging, lotes, rollback, plantilla y contratos de validacion. |
| MSF26-03 | P0 | completed_local | Implementar carga de saldos iniciales: dry-run, commit atomico, errores por fila, reversa y auditoria. |
| MSF26-04 | P0 | completed_local | Exponer onboarding PWA: descarga de plantilla, carga, prevalidacion, aprobacion, historial y evidencias. |
| MSF26-05 | P0 | completed_local | Definir e implementar cliente API hacia SINKRONET FACTURADOR con readiness fail-closed. |
| MSF26-06 | P0 | completed_local | Crear rutina facturable idempotente: evento comercial, payload fiscal, cola/reintentos, conciliacion y webhook. |
| MSF26-07 | P1 | completed_local | Exponer PWA de facturacion: perfil fiscal, documentos, estado, reintentos y bloqueos comerciales. |
| MSF26-08 | P0 | completed_local | QA integral, migraciones, pruebas backend/web, smoke facturador en modo seguro, AuditLock final, commit y push. |

## Gates esperados

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=backend test -- --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- Verificacion UTF-8 sin BOM de `.js`, `.jsx`, `.md` y `.json` modificados.
- `git diff --check`
- Smoke local de contrato facturador con URL fake o mock firmado, sin emision real.
- AuditLock firmado por fase.

## Entregables

- Plan: `docs2/PLAN_HAIKY_MIGRACION_SALDOS_INICIALES_FACTURACION_SKNOMINA_2026.md`
- Matriz: `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/MATRIZ_MSF26_REQUERIMIENTOS.md`
- Contrato: `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/CONTRATO_MSF26_MIGRACION_FACTURACION.md`
- Runbook: `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/RUNBOOK_MSF26_QA_RELEASE.md`
- Baseline: `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/REPORTE_MSF26_00_BASELINE.md`
- Prompts: `.github/prompts/MSF26-{00..08}-*.md`
- Reportes runtime: `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/REPORTE_MSF26_{01..08}_*.md`

## Riesgos residuales controlados

- Facturacion depende de disponibilidad de Render, certificado/firma, ambiente SRI, secuenciales y perfil fiscal del emisor.
- Saldos iniciales requieren validacion contable/laboral profesional antes de cargar clientes reales.
- La integracion entre repos debe quedar por contrato API y pruebas, no por dependencia directa de codigo ni acceso a base del facturador.
- Si el facturador no expone endpoint server-to-server estable para este caso, MSF26-05 debe crear el contrato del lado facturador o bloquear el avance visible en PWA.

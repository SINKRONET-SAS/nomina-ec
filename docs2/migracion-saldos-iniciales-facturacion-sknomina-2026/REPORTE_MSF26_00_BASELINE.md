# Reporte MSF26-00 - Baseline documental

Fecha: 2026-06-28  
Estado: `completed_documental`

## Accion realizada

Se creo el gobierno documental para MSF26 sin modificar runtime, datos, migraciones ni infraestructura. El alcance responde a dos necesidades comerciales:

- Carga de saldos iniciales para que clientes nuevos migren a SKNOMINA con eficiencia.
- Facturacion tributaria de los servicios SKNOMINA usando SINKRONET FACTURADOR como motor fiscal externo.

## Evidencia consultiva

Lectura local, sin secretos, del repo `C:\proyectos web\sinkroniq-mobile`:

- `app.json` identifica la aplicacion como `Sinkronet Facturador`.
- `backend/package.json` describe `Backend Facturacion Electronica Ecuador - Sinkronet`.
- `backend/src/index.js` expone rutas relevantes: `/api/facturas`, `/api/comprobantes`, `/api/secuenciales`, `/api/health`.
- El backend contiene servicios SRI de XML, validacion XSD, firma, colas y worker de factura.

## Estado actual esperado en SKNOMINA

- No se encontro una funcionalidad dedicada de saldos iniciales para onboarding de nuevos clientes.
- Existen pagos/planes, nomina, reportes y PWA operativa; MSF26 debe conectar eventos comerciales facturables con un contrato fiscal externo.
- La integracion debe ser por API y no por acceso directo a base de datos del facturador.

## Artefactos creados

- `docs2/PLAN_HAIKY_MIGRACION_SALDOS_INICIALES_FACTURACION_SKNOMINA_2026.md`
- `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/MATRIZ_MSF26_REQUERIMIENTOS.md`
- `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/CONTRATO_MSF26_MIGRACION_FACTURACION.md`
- `docs2/migracion-saldos-iniciales-facturacion-sknomina-2026/RUNBOOK_MSF26_QA_RELEASE.md`
- `.github/prompts/MSF26-{00..08}-*.md`
- `.github/CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

## Bloqueos antes de runtime

- Definir contrato final de endpoint server-to-server en SINKRONET FACTURADOR.
- Confirmar ambiente de emision: certificacion, produccion o mock firmado.
- Confirmar politica contable/laboral para saldos iniciales por tipo.
- Confirmar responsables autorizados para aprobar lote de migracion y emision fiscal.

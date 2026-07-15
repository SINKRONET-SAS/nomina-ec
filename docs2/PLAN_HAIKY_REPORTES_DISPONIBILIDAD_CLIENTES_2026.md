# Plan Haiky HRD26 - Reportes y disponibilidad para clientes 2026

Plan: `HAIKY-REPORTES-DISPONIBILIDAD-CLIENTES-2026`

Reglas base: `RULES.md`

Alcance: LANDING, PWA, BACKEND, MOBILE, parametros legales Ecuador 2026 y no regresion de reportes.

## Objetivo

Mejorar la gestion de reportes para clientes con salidas individuales y globales, mensuales y acumulativas. Agregar una matriz donde las filas sean empleados y las columnas sean novedades del rol, sin reemplazar reportes verticales auditables ni romper contratos existentes.

## Fuentes reconfirmadas

- SRI Impuesto a la Renta: https://www.sri.gob.ec/impuesto-renta
- SRI tablas IR 2026 PDF: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf
- Ministerio del Trabajo sistema salarial: https://salarios.trabajo.gob.ec/
- IESS empleador: https://www.iess.gob.ec/es/web/empleador/avisos-de-entrada-y-salida

## Fases

### HRD26-00 Baseline

Revisar estado actual del repo, contratos, rutas de reportes, mobile y fuentes legales 2026. Salida: diagnostico reproducible sin cambios funcionales.

### HRD26-01 Backend reportes

Agregar `PAYROLL_NOVELTY_MATRIX` en backend, usando lineas de calculo de nomina para detectar novedades. Salida: XLSX/CSV con empleados en filas, columnas dinamicas de novedad, totales de ingreso, deduccion y neto.

### HRD26-02 PWA disponibilidad

Exponer matriz de novedades, alcance Global/Individual, busqueda de empleado, exporte mensual y acumulado anual. Salida: controles visibles sin escritura manual de IDs.

### HRD26-03 Legal Ecuador 2026

Reconfirmar parametros versionados: SBU, aportes IESS, tabla IR 2026 y base imponible de relacion de dependencia. Salida: informe con fuentes y estado de parametros.

### HRD26-04 Scripts JS y contratos

Generar scripts `audit:reportes:2026` y `haiky:reportes:2026`; reforzar `verify-system-contracts.mjs` contra regresiones. Salida: diagnostico JSON/MD y AuditLock firmado.

### HRD26-05 QA release

Ejecutar diagnostico, contratos, pruebas backend focalizadas, Prisma, mobile check, build web y `git diff --check`. Salida: commit con `phase: HRD26` y `task: HRD26.05`, luego push.

## Criterios de no regresion

- No eliminar reportes verticales existentes.
- No cambiar payload publico de `/api/reportes/nomina/exportar` ni `/api/reportes/nomina/:anio/consolidado`.
- No prometer XML IESS oficial; mantener Batch IESS TXT/DAT.
- No modificar parametros legales 2026 sin fuente y AuditLock.
- No exponer datos bancarios o sensibles en reportes de disponibilidad sin control RBAC.

## Scripts

- `npm run audit:reportes:2026`
- `npm run haiky:reportes:2026`

## Artefactos

- `docs2/reportes-disponibilidad-clientes-2026/DIAGNOSTICO_JSON.json`
- `docs2/reportes-disponibilidad-clientes-2026/INFORME_DIAGNOSTICO.md`
- `docs2/reportes-disponibilidad-clientes-2026/SCRIPTS_JS_SOLUCION.md`
- `docs2/reportes-disponibilidad-clientes-2026/CIERRE_GOBIERNO.md`
- `.github/promts/HRD26-00-baseline.md`
- `.github/promts/HRD26-01-backend-reportes.md`
- `.github/promts/HRD26-02-pwa-disponibilidad.md`
- `.github/promts/HRD26-03-legal-ecuador-2026.md`
- `.github/promts/HRD26-04-scripts-contratos.md`
- `.github/promts/HRD26-05-qa-release.md`

## Cierre de gobierno

Estado: cerrado localmente antes de commit.

Gates esperados por `npm run haiky:reportes:2026`: diagnostico HRD26, contratos, pruebas backend focalizadas, Prisma validate, mobile check, build web y `git diff --check`.

Nota de versionado: `docs2/` esta ignorado en `.gitignore`; los artefactos HRD26 se deben versionar con `git add -f` para conservar trazabilidad del plan solicitado.

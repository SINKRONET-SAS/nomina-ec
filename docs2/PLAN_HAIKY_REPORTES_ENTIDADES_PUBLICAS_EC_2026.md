# Plan Haiky - Reportes para entidades publicas Ecuador 2026

Fecha: 2026-07-12.

## Alcance

Responder a la revision de Reportes Entidades con cambios documentales, de contexto, prompts y runtime. El objetivo es evitar promesas regulatorias no respaldadas, separar reportes oficiales de preparaciones operativas y asegurar que los reportes internos escalen para nominas grandes.

## Hallazgos confirmados

| ID | Severidad | Hallazgo | Evidencia | Respuesta |
|----|-----------|----------|-----------|-----------|
| RPE26-H01 | Alta | IESS no debe exponerse como XML SAE; la evidencia revisada apunta a archivos batch ASCII TXT/DAT. | Portal IESS `ksempm1320.jsp` y documento `ksempm1320b.html`: archivos `.txt`/`.dat` separados por `;`. | PWA cambia a `Batch IESS TXT`; backend genera MSU en ASCII y no XML. |
| RPE26-H02 | Alta | La landing prometia `XML SAE IESS` como reporte oficial. | `frontend-web/src/pages/Landing.jsx`. | Copy publico cambia a `Batch IESS TXT`. |
| RPE26-H03 | Media | Formulario 107 usaba selector grande poco eficiente para muchos empleados. | `frontend-web/src/pages/Nomina/DescargarReportes.jsx`. | Se agrega busqueda por cedula, nombre, apellido o ID y se limita el listado visible. |
| RPE26-H04 | Media | La matriz dinamica puede ser confundida como reporte principal para nominas grandes. | `PAYROLL_BENEFITS_MATRIX` crea columnas dinamicas por concepto. | Se prioriza ledger vertical y se advierte que matriz es uso puntual. |
| RPE26-H05 | Media | Contexto historico contradecia la politica conservadora de IESS. | `.github/CODEX_CONTEXT.md` y DPS26. | RPE26 supersede la parte de SAE/IESS como XML oficial. |
| RPE26-H06 | Alta | El establecimiento IESS no puede quedar hardcodeado como `0001`; debe ser parametrizable y monetizable. | Referencia SINKRONIQ-MOBILE/BACKEND: establecimientos como recurso y limite por plan. | Se agrega submenu Datos de empresa > IESS y limite `iess_establecimientos_max`. |
| RPE26-H07 | Media | La monetizacion de establecimientos exige precios claros: contado, mensualidades, tasa nominal e IVA. | Referencia SINKRONIQ-MOBILE/BACKEND: `pricingInputMode`, `cuotasMensuales`, `tasaNominalAnual` y desglose IVA 15%. | Planes SKNOMINA exponen metadata comercial y el sitio muestra precio base + IVA, total, contado anual y mensualidades. |
| RPE26-H08 | Alta | La version publica del plan debe ser la ultima version vigente por raiz comercial. | `paymentController.listPublicPlans` no debe listar versiones antiguas aunque queden publicas por datos historicos. | Catalogo publico usa ranking por raiz, descarta `superseded` y publica solo `catalog_rank = 1`. |

## Decision de producto

- RDEP: se mantiene como XML SRI con XSD y manifest versionados.
- Formulario 107: se mantiene como PDF anual por trabajador con precheck.
- IESS: queda como batch ASCII TXT/DAT para MSU, basado en la guia de procesos batch revisada.
- XML IESS: no se expone como salida productiva; la compatibilidad tecnica conserva el alias del servicio pero genera TXT/DAT.
- Establecimiento IESS: se configura en Datos de empresa > IESS; no hay fallback hardcodeado.
- Monetizacion: los planes comerciales controlan `iess_establecimientos_max` con `-1` como ilimitado.
- Pricing comercial: el sitio muestra precio base + IVA 15%, total, contado anual, mensualidades y tasa nominal anual cuando aplique.
- Version publica: el catalogo publico de planes siempre resuelve la ultima version vigente por plan raiz.
- Reportes internos: prioridad a estructuras verticales para 1000+ empleados.

## Fases

| Fase | Prompt | Objetivo | Gate |
|------|--------|----------|------|
| 00 | `RPE26-00-baseline-gobierno.md` | Congelar hallazgos, fuentes y reglas. | `git status --short --branch`. |
| 01 | `RPE26-01-fuentes-sri-iess.md` | Clasificar SRI como fuente validada e IESS como pendiente tecnico. | Manifest y contexto actualizados. |
| 02 | `RPE26-02-runtime-pwa-backend.md` | Aplicar cambios backend/PWA/landing sin romper rutas. | `node --check backend/src/services/iessSaeGenerator.js`. |
| 03 | `RPE26-03-reportes-escala.md` | Priorizar reportes verticales y busqueda Formulario 107. | `npm.cmd run contracts`. |
| 04 | `RPE26-04-qa-release.md` | Validar regresiones, AuditLock, commit y push. | Backend targeted tests, build web, diff check. |
| 05 | `RPE26-05-iess-batch-establecimientos.md` | Parametrizar establecimiento IESS, generar TXT/DAT, monetizar establecimientos por plan y mostrar pricing con IVA. | Tests backend, Prisma validate, contracts y build web. |

## Reglas RPE26

- No exponer IESS como XML SAE; IESS usa batch ASCII TXT/DAT cuando la fuente revisada aplique.
- No hardcodear establecimiento IESS; debe venir de Datos de empresa > IESS.
- No permitir establecimientos IESS activos por encima del limite comercial del plan.
- No ocultar IVA ni tasa nominal en la presentacion publica de planes.
- No publicar versiones antiguas de planes cuando exista una version vigente mas reciente.
- No eliminar endpoints existentes sin plan de compatibilidad.
- No usar reportes con empleados como columnas para nominas grandes.
- Mantener mensajes visibles en espanol tecnico y con siguiente accion clara.
- Actualizar `.github/CODEX_CONTEXT.md`, `.vscode/AuditLock.json` y `.vscode/AudiLock.json`.

## Gates esperados

- `node --check backend/src/services/iessSaeGenerator.js`
- `node --check scripts/verify-system-contracts.mjs`
- `npm.cmd --workspace=backend test -- iessSaeGenerator.test.js app.routes.test.js configurationService.test.js paymentController.test.js --runInBand`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npm.cmd run contracts`
- `npm.cmd --workspace=frontend-web run build`
- `git diff --check`

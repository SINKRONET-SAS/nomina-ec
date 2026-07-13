# Plan Haiky - Reportes para entidades publicas Ecuador 2026

Fecha: 2026-07-12.

## Alcance

Responder a la revision de Reportes Entidades con cambios documentales, de contexto, prompts y runtime. El objetivo es evitar promesas regulatorias no respaldadas, separar reportes oficiales de preparaciones operativas y asegurar que los reportes internos escalen para nominas grandes.

## Hallazgos confirmados

| ID | Severidad | Hallazgo | Evidencia | Respuesta |
|----|-----------|----------|-----------|-----------|
| RPE26-H01 | Alta | IESS no debe exponerse como XML oficial sin formato tecnico validado. | `backend/src/config/iess/sae-source-manifest.json` declaraba que no hay XSD publico bundled. | PWA cambia a `Preparacion IESS`; XML falla cerrado salvo flag experimental. |
| RPE26-H02 | Alta | La landing prometia `XML SAE IESS` como reporte oficial. | `frontend-web/src/pages/Landing.jsx`. | Copy publico cambia a `prevalidacion IESS`. |
| RPE26-H03 | Media | Formulario 107 usaba selector grande poco eficiente para muchos empleados. | `frontend-web/src/pages/Nomina/DescargarReportes.jsx`. | Se agrega busqueda por cedula, nombre, apellido o ID y se limita el listado visible. |
| RPE26-H04 | Media | La matriz dinamica puede ser confundida como reporte principal para nominas grandes. | `PAYROLL_BENEFITS_MATRIX` crea columnas dinamicas por concepto. | Se prioriza ledger vertical y se advierte que matriz es uso puntual. |
| RPE26-H05 | Media | Contexto historico contradecia la politica conservadora de IESS. | `.github/CODEX_CONTEXT.md` y DPS26. | RPE26 supersede la parte de SAE/IESS como XML oficial. |

## Decision de producto

- RDEP: se mantiene como XML SRI con XSD y manifest versionados.
- Formulario 107: se mantiene como PDF anual por trabajador con precheck.
- IESS: queda como prevalidacion operativa hasta contar con formato oficial de carga o guia tecnica aprobada.
- XML IESS: endpoint legado conservado, pero bloqueado por defecto con `IESS_XML_FORMAT_NOT_VALIDATED`.
- Reportes internos: prioridad a estructuras verticales para 1000+ empleados.

## Fases

| Fase | Prompt | Objetivo | Gate |
|------|--------|----------|------|
| 00 | `RPE26-00-baseline-gobierno.md` | Congelar hallazgos, fuentes y reglas. | `git status --short --branch`. |
| 01 | `RPE26-01-fuentes-sri-iess.md` | Clasificar SRI como fuente validada e IESS como pendiente tecnico. | Manifest y contexto actualizados. |
| 02 | `RPE26-02-runtime-pwa-backend.md` | Aplicar cambios backend/PWA/landing sin romper rutas. | `node --check backend/src/services/iessSaeGenerator.js`. |
| 03 | `RPE26-03-reportes-escala.md` | Priorizar reportes verticales y busqueda Formulario 107. | `npm.cmd run contracts`. |
| 04 | `RPE26-04-qa-release.md` | Validar regresiones, AuditLock, commit y push. | Backend targeted tests, build web, diff check. |

## Reglas RPE26

- No exponer IESS como XML oficial hasta que exista fuente tecnica oficial versionada.
- No eliminar endpoints existentes sin plan de compatibilidad.
- No usar reportes con empleados como columnas para nominas grandes.
- Mantener mensajes visibles en espanol tecnico y con siguiente accion clara.
- Actualizar `.github/CODEX_CONTEXT.md`, `.vscode/AuditLock.json` y `.vscode/AudiLock.json`.

## Gates esperados

- `node --check backend/src/services/iessSaeGenerator.js`
- `node --check scripts/verify-system-contracts.mjs`
- `npm.cmd --workspace=backend test -- iessSaeGenerator.test.js app.routes.test.js --runInBand`
- `npm.cmd run contracts`
- `npm.cmd --workspace=frontend-web run build`
- `git diff --check`


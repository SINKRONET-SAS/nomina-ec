# Plan Haiky - Auditoria integral V2 SKNOMINA Ecuador 2026

## Objetivo

Ejecutar una auditoria integral sobre LANDING, PWA, BACKEND y MOBILE sin desplegar propuestas regresivas. La pasada V2 debe confirmar hallazgos antes de corregir, humanizar UI/UX, fortalecer el motor de nomina, revisar duplicacion/deuda, validar UTF-8, y documentar cumplimiento Ecuador 2026 para facturacion electronica y proteccion de datos personales.

## Decisiones confirmadas

- Facturacion electronica se presenta comercialmente como **SINKRONET FACTURADOR**.
- SKNOMINA debe consumir la API provista por **SINKRONIQ-MOBILE**; no debe clonar XML, firma, RIDE ni autorizacion SRI.
- Establecimientos IESS son dato parametrizable de empresa y capacidad monetizable por plan (`iess_establecimientos_max`).
- La tasa nominal anual es insumo de calculo entre precio contado anual y mensualidad; no debe mostrarse como texto suelto.
- Precios publicos deben presentar base, IVA 15%, total mensual y contado anual con claridad.
- Reportes grandes deben priorizar formato vertical: empleado-periodo y empleado-periodo-concepto.

## Fuentes 2026 verificadas

- SRI facturacion electronica: `https://www.sri.gob.ec/facturacion-electronica`.
- LOPDP Ecuador: `https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf`.
- Ministerio del Trabajo salarios: `https://salarios.trabajo.gob.ec/`.

## Fases

| Fase | Estado | Objetivo | Prompt |
|------|--------|----------|--------|
| AIV2-00 | completed | Baseline, contexto, fuentes y criterios anti-regresion. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-00-baseline.md` |
| AIV2-01 | completed | Diagnostico JS: UTF-8, silencios, duplicacion, codigo muerto candidato. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-01-diagnostico-js.md` |
| AIV2-02 | completed | Motor de nomina: integridad de totales y pruebas focalizadas. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-02-motor-nomina.md` |
| AIV2-03 | completed | UI/UX: precios, textos, descargas, chunk inicial. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-03-uiux-precios.md` |
| AIV2-04 | completed | Backend/API: SINKRONET FACTURADOR via SINKRONIQ-MOBILE, IESS parametrizable. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-04-backend-api-legal.md` |
| AIV2-05 | completed | Mobile/PWA homologacion y plan de deuda. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-05-mobile-pwa-paridad.md` |
| AIV2-06 | completed | QA, AuditLock, no regresion, commit y push. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-06-qa-release.md` |
| AIV2-07 | completed | Asistencia parametrizable, operacion diaria/mensual, base 30 y listado maestro de empleados. | `.github/prompts/HAIKY-AUDITORIA-INTEGRAL-V2-2026-07-asistencia-nomina.md` |

## Hallazgos y acciones V2

| Hallazgo | Severidad | Estado | Accion |
|----------|-----------|--------|--------|
| Helper `downloadBlob` duplicado en PWA. | Media | resuelto | Consolidado en `frontend-web/src/utils/downloadBlob.js`. |
| Bundle inicial cargaba muchas pantallas por import estatico. | Media | resuelto | Rutas publicas e internas pasan a `React.lazy` + `Suspense`. |
| Motor de nomina no exponia guard explicito de integridad ingreso-deduccion-neto. | Alta | resuelto | `assertPayrollTotalsIntegrity` y pruebas focalizadas. |
| Precios publicos podian leerse como "precio + IVA" sin jerarquia clara entre mensualidad y contado. | Media | resuelto | Tarjeta muestra mensualidad con IVA, contado anual con IVA y nota de calculo. |
| Evidencia visual automatizada no disponible en workspace. | Baja | pendiente-manual | Playwright no instalado; se documenta limitacion y no se usan screenshots antiguos como evidencia actual. |
| Facturacion electronica puede confundirse con modulo local. | Alta | controlado | Nombre comercial SINKRONET FACTURADOR; arquitectura por API SINKRONIQ-MOBILE. |
| Cero marcaciones se presentaba como cero dias trabajados. | Alta | resuelto | El reporte separa dias con marcacion y faltas aprobadas; la nomina solo descuenta novedades aprobadas. |
| Empleados ingresados durante el mes quedaban fuera del calculo. | Alta | resuelto | La seleccion llega hasta el ultimo dia del periodo y prorratea sobre base mensual de 30 dias. |
| Asistencia no distinguia empleados sujetos o no a control. | Alta | resuelto | `controla_asistencia` se configura en la ficha y gobierna reporte, app y cargas globales sin bloquear nomina al estar desactivado. |
| No existia carga manual diaria/mensual con alcance individual/global. | Alta | resuelto | Operacion transaccional e idempotente para un dia, mes o rango de hasta 31 dias. |
| No existia listado maestro descargable de empleados. | Media | resuelto | XLSX vertical, una fila por empleado, protegido por RBAC y auditoria LOPDP. |

## Candidatos a eliminacion

- Historial Haiky/prompts antiguos: archivar, no eliminar, porque sostienen trazabilidad.
- Mocks de pruebas: conservar; no son deuda productiva.
- Query/estado pendiente en `PaymentResult`: revisar renombre futuro; no activa planes.
- Helpers inline de descarga Blob: eliminados en V2.

## Gates

- `npm run audit:integral:v2`
- `npm run haiky:solution:v2`
- `node scripts/verify-system-contracts.mjs`
- `npm.cmd --workspace=backend test -- calculoNominaService.test.js paymentController.test.js fiscalInvoiceService.test.js employeeImportService.test.js --runInBand`
- `npm run prisma:validate`
- `npm run check:mobile`
- `node node_modules/vite/bin/vite.js build` desde `frontend-web`
- `git diff --check`

## Cierre incremental AIV2-07

- Migracion: `20260714190000_employee_attendance_control`.
- Motor: meses y ausencias se prorratean sobre 30 dias; febrero completo equivale a 30 dias y el dia 31 se normaliza al dia 30.
- Asistencia: alcance `Un empleado` o `Todos`; periodo `Un dia`, `Mes` o `Rango`.
- Seguridad: roles `owner` y `admin_rrhh`, usuario fresco, modulo asistencia, periodo abierto, bloqueo transaccional por tenant, preservacion de marcaciones existentes y auditoria atomica.
- Reporte: marcaciones y novedades se agregan en CTE separadas para evitar multiplicaciones.
- Empleados: `Listado XLSX` vertical sin numero de cuenta bancaria.
- Evidencia: backend 55 suites / 347 pruebas, contratos PASS, Prisma PASS, mobile PASS, build PWA PASS y smoke XLSX local con 30 filas.

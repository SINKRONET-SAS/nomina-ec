# REPORTE CBN26-10 - QA y release CBN26

Estado: completed_local_with_residual_risks
Fecha: 2026-06-14

## Matriz de cierre

| Fase | Estado | Evidencia |
| --- | --- | --- |
| CBN26-01 | completed_local | PDF sin Base44, contrato reforzado y errores visibles. |
| CBN26-02 | completed_local | Boton PDF con estados UI y `authenticatedApi`. |
| CBN26-03 | completed_local | Beneficios CRUD, migracion, endpoints y UI. |
| CBN26-04 | completed_by_stack_mapping | No existe `empleadoFiltro` ni `Marcaciones.jsx` en stack real. |
| CBN26-05 | completed_local | Anticipos/prestamos entran al calculo y cierre descuenta saldos. |
| CBN26-06 | completed_by_stack_mapping | No existe `empresas[0]`; nueva tabla respeta tenant. |
| CBN26-07 | completed_local | Capacidades por plan, gestion de planes y enforcement bancario. |
| CBN26-08 | completed_local_with_professional_block | Parametros versionados ampliados como fuente primaria. |
| CBN26-09 | completed_local | Marcaciones de hoy y cron usan filtros indexables. |

## Validaciones ejecutadas

- `npx.cmd prisma migrate deploy`: migracion CBN26 aplicada.
- `npx.cmd prisma validate`: schema valido.
- `npm.cmd test -- --runInBand`: 9 suites, 22 tests.
- `npm.cmd run build` en frontend-web: Vite build y PWA generados.
- `rg` sin patrones: `base44`, `UploadFile`, `getToken?.(`, `empresas[0]`, `PARAMETROS_2026`, `const anticipos = 0`, `const prestamos = 0`.

## Riesgos residuales

- PDF depende de que el flujo documental genere `rol_pdf_url`.
- Planes solo bloquean archivo bancario en esta pasada; cualquier nueva funcionalidad monetizada debe agregarse a `planCapabilityService`.
- IESS y parametros legales siguen sujetos a validacion oficial/profesional antes de produccion.
- RLS Render con usuario no superusuario sigue como gate externo.

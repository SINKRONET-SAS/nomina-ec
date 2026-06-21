# Reporte DV3N26-08 - Cierre Runtime

Fecha: 2026-06-21.

## Estado

DV3N26-01 a DV3N26-08 ejecutadas localmente sobre el stack real de Nomina-Ec. AIV50 ya estaba cerrado y se uso como antecedente de seguridad/rendimiento.

## Cierres funcionales

- DV3N26-01 Bancos y cierre de nomina: el generador bancario acepta solo nominas `cerrada` o `pagada`, agrega estado en la hoja de revision y conserva error visible cuando no hay nominas aptas.
- DV3N26-02 Legal laboral: liquidacion calcula vacaciones con 15 dias por anio y dias adicionales posteriores al quinto anio; fondo de reserva se mantiene en reportes y resumen PDF.
- DV3N26-03 Reportes y contabilidad: reportes de nomina incorporan `PAYROLL_ACCOUNTING_ENTRIES` para asientos de devengamiento y pago, con cuadre debe/haber probado. La PWA lo expone en Reportes Entidades.
- DV3N26-04 LOPDP: privacidad, terminos, banner de cookies y consentimiento OWNER ya estaban implementados por LPA/AIV50; se conserva trazabilidad y no se cachean API de nomina.
- DV3N26-05 Cifrado bancario: cuentas nuevas se cifran con AES-256-GCM mediante `BANK_ACCOUNT_ENCRYPTION_KEY`; no existe fallback local inseguro. Lectura mantiene compatibilidad con valores legacy `pgcrypto`.
- DV3N26-06 PWA offline: se registra service worker explicitamente, manifest `es-EC` y Workbox mantienen `/api` en `NetworkOnly` para evitar datos obsoletos.
- DV3N26-07 SUT/MDT: contratos y actas muestran aviso operativo visible. No se marca registro SUT/MDT como integrado sin credenciales o confirmacion externa.
- DV3N26-08 QA: gates globales y UTF-8 sin BOM ejecutados.

## Gates ejecutados

- `npx.cmd prisma validate` en backend: PASS.
- `npm.cmd test -- --runInBand` en backend: PASS, 26 suites, 98 tests.
- `npm.cmd run build` en frontend-web: PASS.
- `npm.cmd run smoke:pwa` en frontend-web: PASS.
- `npm.cmd run check:stores` en app-movil: PASS.
- `npm.cmd run doctor` en app-movil: PASS, 18/18 checks.
- `git diff --check`: PASS, solo advertencias CRLF.
- UTF-8 sin BOM: PASS, 15 archivos modificados/nuevos.

## Bloqueos externos

- Revision legal/contable profesional antes de produccion.
- Confirmar obligacion y flujo oficial SUT/MDT para cada tipo documental antes de prometer integracion automatica.
- Definir `BANK_ACCOUNT_ENCRYPTION_KEY` productiva de 32 bytes o 64 hex fuera del repositorio antes de crear o importar empleados con cuenta bancaria.

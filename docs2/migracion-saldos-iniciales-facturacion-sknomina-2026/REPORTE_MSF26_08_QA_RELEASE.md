# REPORTE MSF26-08 - QA release

Fecha: 2026-06-28  
Estado: completed_local

## Gates ejecutados

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- --runInBand`: PASS, 51 suites, 212 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `npm.cmd run check:mobile`: PASS.
- `.\node_modules\.bin\prisma.cmd migrate deploy --schema prisma\schema.prisma`: PASS en PostgreSQL local `plan_haiky`.
- `git diff --check`: PASS con avisos CRLF esperados en Windows.
- UTF-8 sin BOM: PASS.

## Migracion aplicada

- `20260628143000_msf26_initial_balances_fiscal_billing`.

## Riesgos residuales

- La emision real depende de URL, credencial, secreto webhook, certificado, secuenciales y disponibilidad de SINKRONET FACTURADOR/Render/SRI.
- Los saldos iniciales de clientes reales requieren aprobacion contable/laboral y respaldo antes de commit.

## Resultado

MSF26 queda listo para commit y push con trazabilidad Haiky.

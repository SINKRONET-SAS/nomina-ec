# REPORTE APK26-09 - QA release

Fecha: 2026-06-28

## Gates ejecutados

- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `npm.cmd --workspace=backend test -- --runInBand`: PASS, 51 suites, 212 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS.
- `npm.cmd run check:mobile`: PASS.
- `npx.cmd expo-doctor` en `app-movil`: PASS, 18/18 checks.
- `git diff --check`: PASS con avisos CRLF esperados en Windows.

## Limitacion

La verificacion con navegador integrado no pudo iniciarse por error de configuracion del sandbox del REPL
antes de navegar a la PWA. El build de Vite y los gates funcionales quedaron verdes.

## Cierre

APK26 cierra los hallazgos con runtime y gobierno:
metadatos de tienda, consola fundador, ortografia, roles mobile, metadatos legales, politica `docs2` y
riesgos controlados de parametrizacion/FCM.


# Reporte CPD26 00-03 - Costos produccion documentos SKNOMINA

## Resultado

CPD26 queda ejecutado y validado localmente. La produccion inicial queda orientada a un solo backend API con disco persistente Render, sin dependencia inmediata de AWS/S3 y sin worker cron separado.

## Cambios runtime

- `render.yaml` monta disco persistente `sknomina-documents` en `/var/data` para `sknomina-api`.
- `render.yaml` cambia `STORAGE_DRIVER` productivo de `s3` a `local`.
- `render.yaml` define `LOCAL_STORAGE_DIR=/var/data/sknomina-documents`.
- `render.yaml` define `LOCAL_STORAGE_PUBLIC_BASE_URL=https://api.sknomina.com`.
- `render.yaml` retira `sknomina-worker-cron` del blueprint productivo inicial.
- `backend/.env.example` documenta storage local y deja AWS/R2 como opcion futura.
- `scripts/verify-system-contracts.mjs` protege que no vuelva el blueprint con S3 obligatorio o worker cron inicial.

## Contratos confirmados

- Roles PDF individuales y transpuestos se generan desde endpoints del backend API.
- Archivos bancarios se generan desde `/api/reportes/banco`.
- `cron-jobs.js` no genera documentos descargables; opera novedades, calculo mensual automatico, sesiones, alertas y purga.
- Produccion inicial mantiene nomina y documentos bajo accion manual/auditable desde PWA.

## Gates ejecutados

- `node --check scripts/verify-system-contracts.mjs`: PASS.
- `npm.cmd run contracts`: PASS.
- `git diff --check`: PASS.
- UTF-8 sin BOM en archivos `.js`, `.md`, `.json` y `.yaml` modificados: PASS.

## Riesgos residuales

- Render Persistent Disk solo puede ser usado por un servicio/instancia; no escalar horizontalmente `sknomina-api` con este esquema.
- Los despliegues con disco pueden tener una breve ventana sin zero-downtime.
- Si se necesita worker, cron o multiples instancias leyendo los mismos documentos, migrar a S3/R2.
- La purga LOPDP automatica queda fuera del worker inicial; se debe ejecutar por runbook o reintroducir como tarea separada sin documentos.

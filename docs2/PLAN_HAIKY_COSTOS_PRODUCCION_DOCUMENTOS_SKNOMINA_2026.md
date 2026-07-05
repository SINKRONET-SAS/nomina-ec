# HAIKY-COSTOS-PRODUCCION-DOCUMENTOS-SKNOMINA-2026

| Campo | Valor |
|-------|-------|
| Codigo | CPD26 |
| Estado | completed-pass |
| Requerimiento fuente | Llegar a produccion con costos controlados, sin AWS obligatorio y con documentos generados/descargados solo por backend API. |
| Contexto | `.github/CODEX_CONTEXT.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/CPD26-00-baseline-gobierno.md` a `.github/prompts/CPD26-03-qa-release.md` |

## Objetivo

Cerrar la decision de infraestructura documental para produccion inicial: SKNOMINA debe operar roles PDF, archivos bancarios, reportes y documentos laborales desde `sknomina-api`, usando disco persistente de Render con costo bajo y predecible. El worker cron no debe participar en generacion ni descarga documental mientras no exista almacenamiento compartido S3/R2.

## Decision CPD26

- `sknomina-api` es el unico servicio que genera y descarga documentos en produccion inicial.
- `render.yaml` usa `STORAGE_DRIVER=local`.
- Render monta un disco persistente en `/var/data`.
- Los documentos se escriben en `/var/data/sknomina-documents`.
- La base publica de descarga es `https://api.sknomina.com`.
- `sknomina-worker-cron` queda fuera del blueprint productivo inicial.
- El calculo de nomina mensual queda manual y auditable desde PWA, no automatico por cron.

## Hallazgos

| ID | Severidad | Hallazgo | Resolucion |
|----|-----------|----------|------------|
| CPD26-F01 | ALTO | `render.yaml` declaraba `STORAGE_DRIVER=s3` sin que exista AWS/S3 configurado. | Render queda en `STORAGE_DRIVER=local` con disco persistente. |
| CPD26-F02 | ALTO | El worker cron tambien pedia S3, duplicando costo y dependencia externa. | Worker eliminado del blueprint inicial. |
| CPD26-F03 | MEDIO | El cron podia calcular nomina automaticamente al cierre de mes. | Produccion inicial mantiene calculo manual desde PWA. |
| CPD26-F04 | MEDIO | Los documentos ya se generan por endpoints del backend, no por cron. | Se protege esa decision con contrato anti-regresion. |
| CPD26-F05 | MEDIO | `.env.example` no documentaba la ruta local persistente para Render. | Se agregan `LOCAL_STORAGE_DIR` y `LOCAL_STORAGE_PUBLIC_BASE_URL`. |

## Fases

| Fase | Prioridad | Estado | Entregable |
|------|-----------|--------|------------|
| CPD26-00 | P0 | completed | Plan, prompts, contexto y AuditLock base. |
| CPD26-01 | P0 | completed | `render.yaml` con API + disco persistente + storage local. |
| CPD26-02 | P0 | completed | Worker cron fuera del blueprint y cron documentado como manual/posterior. |
| CPD26-03 | P0 | completed-pass | Contratos, UTF-8, reporte y cierre. |

## Variables Render productivas

```env
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=/var/data/sknomina-documents
LOCAL_STORAGE_PUBLIC_BASE_URL=https://api.sknomina.com
```

Disco Render:

```text
name: sknomina-documents
mountPath: /var/data
sizeGB: 5
```

## Politica de cron

El cron actual queda fuera de produccion inicial porque:

- Genera novedades por faltas sin revision humana previa.
- Calcula nomina automaticamente el ultimo dia del mes.
- No genera roles PDF ni archivos bancarios; esos flujos ya son endpoints del API.
- Un disco Render solo esta disponible para un servicio/instancia, por lo que no debe depender de un worker separado para documentos.

Reintroduccion permitida:

- Como cron job aislado para purga LOPDP si no toca documentos.
- Como worker con S3/R2 si se migra a almacenamiento compartido.
- Como tarea manual/runbook para operaciones controladas.

## Fuentes externas verificadas

- Render Blueprint YAML Reference: `https://render.com/docs/blueprint-spec`.
- Render Persistent Disks: `https://render.com/docs/disks`.

## Rollback

1. Restaurar `STORAGE_DRIVER=s3` solo si existe bucket S3/R2 real, credenciales y endpoint validado.
2. Reintroducir `sknomina-worker-cron` solo si no necesita leer/escribir documentos locales o si se usa storage compartido.
3. Cambiar `LOCAL_STORAGE_DIR` a storage compartido o desmontar disco despues de migrar archivos.
4. Ejecutar `npm.cmd run contracts`, `git diff --check` y smoke de descarga de rol PDF.

# Runbook Render - Plan HAIKY

Fecha: 2026-06-11

## Servicios

- `haiky-postgres`: PostgreSQL administrado.
- `haiky-api`: API Express.
- `haiky-worker-cron`: worker separado para trabajos programados.
- `haiky-frontend`: sitio estatico Vite.
- Redis: servicio externo compatible, configurado por `REDIS_URL`.
- Storage: S3 o compatible, configurado por variables `AWS_*`.

## Variables obligatorias

Backend API y worker:

- `DATABASE_URL`
- `DB_SSL=true`
- `JWT_SECRET`
- `FRONTEND_URL`
- `REDIS_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

Frontend:

- `VITE_API_URL`

## Orden de despliegue

1. Crear PostgreSQL.
2. Configurar variables secretas.
3. Desplegar API con `npm ci && npm run db:migrate`.
4. Desplegar worker cron con el mismo build.
5. Desplegar frontend con `npm ci && npm run build`.
6. Probar `/health`, login, cierre de nomina de prueba y generacion de reportes.

## Controles antes de produccion

- Backups automaticos habilitados.
- `JWT_SECRET` rotado fuera del valor de ejemplo.
- `FRONTEND_URL` restringido al dominio real.
- Worker ejecutandose en proceso separado del API.
- Archivos bancarios y documentos en storage externo, no en disco efimero.

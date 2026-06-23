# MRM26-02 - Modelo de datos

Actua bajo `RULES.md`.

Objetivo: disenar y aplicar, si se aprueba, el modelo de datos tenant-aware para sitios, rutas, paradas, visitas, excepciones, politicas e indices.

Tareas:

- Definir tablas para sitios de visita, rutas diarias, paradas, marcas de visita y excepciones.
- Incluir `tenantId`, periodo operacional, empleado, timestamps de dispositivo/servidor e indices.
- Definir RLS/filtros obligatorios y retencion de datos sensibles.
- Definir politica para evidencia: GPS, foto, QR, comentario y visita no programada.
- Crear migracion Prisma y rollback si la fase se aprueba.

Cierre:

- `npx.cmd prisma validate`.
- `npx.cmd prisma migrate deploy` en entorno local.
- Reporte `REPORTE_MRM26_02_MODELO_DATOS.md`.
- AuditLock firmado.
- Commit esperado: `phase: MRM26-02 task: modelo datos rutas sitios`.

# MSF26-01 - Diagnostico runtime SKNOMINA y facturador

Objetivo: diagnosticar el runtime real antes de tocar codigo.

Instrucciones:

- Requiere aprobacion explicita.
- Aplicar `RULES.md`.
- Inventariar en SKNOMINA: pagos, planes, suscripciones, tenant, perfil fiscal, empleados, nomina, beneficios, descuentos, novedades, contabilidad, reportes y rutas PWA.
- Inventariar en SINKRONET FACTURADOR: endpoints, autenticacion, facturas, comprobantes, secuenciales, health, worker, webhooks y limites.
- No crear migraciones ni emitir facturas.
- Proponer contrato API y brechas.

Salida esperada:

- `REPORTE_MSF26_01_DIAGNOSTICO_RUNTIME.md`.
- Matriz actualizada con brechas confirmadas.
- AuditLock firmado.

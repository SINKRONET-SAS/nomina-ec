# Inventario de procesadores y DPA

## Procesadores previstos

| Procesador | Uso | Datos posibles | DPA requerido | Estado |
|------------|-----|----------------|---------------|--------|
| Hosting backend/web | Operacion SaaS | usuarios, tenants, auditoria, nomina | si | pendiente contrato productivo |
| Base de datos administrada | Persistencia | datos laborales y configuracion | si | pendiente contrato productivo |
| Proveedor email | Verificacion y recuperacion | email, nombre, token temporal | si | pendiente seleccion |
| Pasarela de pago | Suscripcion | empresa, plan, transaccion | si | pendiente produccion |
| App stores | Distribucion app | metadata, telemetria de tienda | segun contrato tienda | externo |
| Analitica opcional | Medicion comercial | eventos no sensibles | si y consentimiento | bloqueado hasta consentimiento |

## Reglas

- Registrar finalidad, base, pais, subprocesadores y contacto.
- No activar analitica no esencial sin consentimiento.
- No compartir datos reales para demos o soporte no autorizado.
- Revisar contratos antes de produccion.

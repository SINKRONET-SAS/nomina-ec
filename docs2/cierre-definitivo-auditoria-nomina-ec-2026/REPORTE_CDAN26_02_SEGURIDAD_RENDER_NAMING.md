# Reporte CDAN26-02 - Seguridad Render y naming

## Cierre

El runtime activo de Render queda con naming publico Nomina-Ec:

- Base Render: `nomina-ec-postgres`.
- Base PostgreSQL: `nomina_ec`.
- Usuario: `nomina_ec_app`.
- API: `nomina-ec-api`.
- Frontend: `nomina-ec-frontend`.

## Cambios CDAN26

- Se agregaron variables no sensibles para contrato de pagos: `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`.
- No se escribieron secretos en repo.

## Riesgo residual

Los artefactos historicos en `docs2/archive` pueden contener nombres antiguos como evidencia documental. No forman parte de runtime ni infraestructura activa.


# HNBE26-02 - Contrato legal-parametrico Ecuador

Fecha: 2026-06-12

## Contrato canonico

Todo parametro laboral debe conservar:

- `country_code`, `region_code`, `period_year`, `parameter_key`.
- `value`, `unit`, `rounding_mode`.
- `validation_status`, `source_name`, `source_url`, `source_date`.
- `valid_from`, `valid_to`, `approved_by`, `approved_at`.
- Evidencia documental y responsable de aprobacion.

## Parametros minimos

| Parametro | Uso | Estado |
|-----------|-----|--------|
| SBU | Decimo cuarto, minimos y validaciones | Requiere fuente oficial vigente. |
| IESS personal | Deduccion empleado | Bloqueado para produccion sin validacion profesional. |
| IESS patronal | Costo empleador | Incluido en detalle de calculo. |
| Tabla IR | Impuesto mensual proyectado | Debe versionarse por anio fiscal. |
| Jornada maxima | Horas ordinarias y extras | Debe vincularse con jornadas configurables. |
| Horas extra 50/100 | Ingresos variables | Debe depender de novedades aprobadas. |
| Decimos | Provisiones y acumulacion | Debe soportar mensualizacion/acumulacion. |
| Vacaciones | Provision y liquidacion | Debe conservar historial de devengo. |
| Fondos de reserva | Provision desde primer anio cumplido | Incluido en detalle de calculo. |

## LOPDP

Datos sensibles o de alto cuidado: cuenta bancaria cifrada, geolocalizacion, fotos, documentos laborales, salud/subsidios, solicitudes y roles de pago. La activacion productiva requiere consentimiento, finalidad, retencion, exportacion, purge y control de acceso por empleado.


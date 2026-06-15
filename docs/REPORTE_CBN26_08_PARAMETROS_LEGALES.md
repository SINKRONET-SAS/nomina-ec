# REPORTE CBN26-08 - Parametros legales como fuente primaria

Estado: completed_local_with_professional_block
Fecha: 2026-06-14

## Resultado

`legalParameterService` ahora incorpora parametros versionados adicionales como fuente primaria del calculo:

- `sbu`
- `iess_aporte_personal`
- `iess_aporte_patronal`
- `jornada_horas_mensuales`
- `jornada_maxima_semanal`
- `provision_vacaciones`
- `vacaciones_dias_anuales`
- `decimos`
- `fondo_reserva`
- `income_tax_table`

Si existen parametros versionados, el estado legal consolidado se mantiene pendiente salvo que todos esten `validado_oficial`. El bloqueo productivo sigue activo con `LEGAL_PARAMETERS_NOT_VALIDATED`.

## Validacion

- `node --check backend/src/services/legalParameterService.js` paso.
- Backend tests completos pasaron.
- Frontend build paso.

## Riesgo residual

No se valida oficialmente IESS ni otros parametros sin fuente y aprobacion profesional.

# Reporte ONI26-FUNC-02 - Carga legal obligatoria

## Resultado

Se agrego funcionalidad real para cargar parametros legales obligatorios por anio fiscal desde la base legal versionada del sistema, sin exigir digitacion manual uno por uno.

## Alcance funcional

- Boton en `Parametrizacion`: `Cargar parametros obligatorios`.
- Selector de anio fiscal.
- Endpoint backend `POST /api/configuracion/parametros-legales/obligatorios`.
- Carga o actualiza en `legal_parameter_versions`:
  - SBU,
  - aporte IESS personal,
  - aporte IESS patronal,
  - horas mensuales,
  - jornada maxima semanal,
  - provision vacaciones,
  - dias de vacaciones,
  - decimo tercer sueldo,
  - decimo cuarto sueldo Costa/Galapagos,
  - decimo cuarto sueldo Sierra/Amazonia,
  - fondo de reserva,
  - tabla anual de impuesto a la renta.
- Auditoria con `correlationId`.
- Paso de onboarding legal marcado como completado para tenant.

## Validaciones

- `node --check backend/src/services/configurationService.js`
- `node --check backend/src/controllers/configurationController.js`
- `node --check backend/src/app.js`
- `npm.cmd run build` en `frontend-web`

## Criterio legal

La carga genera parametros revisables y marca `pendiente_validacion_oficial`. No declara validacion profesional ni cumplimiento productivo automatico.

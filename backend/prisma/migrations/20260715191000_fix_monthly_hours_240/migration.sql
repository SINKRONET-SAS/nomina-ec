-- Corrige parametros versionados de jornada mensual cargados con el promedio
-- semanal anualizado (40 * 52 / 12 = 173.33). El motor de nomina Ecuador usa
-- la base mensual legal/operativa de 30 dias x 8 horas = 240 para valor hora.

UPDATE legal_parameter_versions
SET
  value = COALESCE(value, '{}'::jsonb)
    || jsonb_build_object('amount', 240, 'calculationBase', '30_dias_x_8_horas'),
  unit = 'horas',
  notes = CONCAT_WS(
    E'\n',
    NULLIF(notes, ''),
    'Corregido por migracion 20260715191000: 173.33 corresponde a promedio semanal anualizado; para valor hora de nomina Ecuador se usa 240.'
  ),
  updated_at = NOW()
WHERE country_code = 'EC'
  AND parameter_key = 'jornada_horas_mensuales'
  AND period_year >= 2025
  AND COALESCE(value->>'amount', '') ~ '^[0-9]+(\.[0-9]+)?$'
  AND (value->>'amount')::numeric > 160
  AND (value->>'amount')::numeric < 190;

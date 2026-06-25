-- Nomina-Ec - Actualizacion oficial SBU 2026
-- Fuente: Ministerio del Trabajo, noticia oficial sobre consenso de SBU 2026 en USD 482.

UPDATE parametros_legales
SET salario_basico = 482.00,
  fuente = 'pendiente_validacion_oficial:ir_sri_nac_dgercgc25_00000043:sbu_mdt_2026_482',
  updated_at = NOW()
WHERE anio = 2026
  AND pais = 'EC'
  AND tenant_id IS NULL;

-- PLAN HAIKY - Actualizacion oficial tabla IR 2026 SRI
-- Fuente: Resolucion Nro. NAC-DGERCGC25-00000043, Segundo Suplemento del Registro Oficial No. 194, 30/12/2025.

UPDATE parametros_legales
SET tabla_impuesto_renta = '[
    {"from":0,"to":12208,"rate":0,"baseTax":0},
    {"from":12208,"to":15549,"rate":0.05,"baseTax":0},
    {"from":15549,"to":20188,"rate":0.10,"baseTax":167},
    {"from":20188,"to":26700,"rate":0.12,"baseTax":631},
    {"from":26700,"to":35136,"rate":0.15,"baseTax":1412},
    {"from":35136,"to":46575,"rate":0.20,"baseTax":2678},
    {"from":46575,"to":62005,"rate":0.25,"baseTax":4965},
    {"from":62005,"to":82679,"rate":0.30,"baseTax":8823},
    {"from":82679,"to":109956,"rate":0.35,"baseTax":15025},
    {"from":109956,"to":null,"rate":0.37,"baseTax":24572}
  ]'::jsonb,
  fuente = 'pendiente_validacion_oficial:ir_sri_nac_dgercgc25_00000043',
  updated_at = NOW()
WHERE anio = 2026
  AND pais = 'EC'
  AND tenant_id IS NULL;

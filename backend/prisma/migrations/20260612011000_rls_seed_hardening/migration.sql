-- Nomina-Ec - RLS, inmutabilidad y seed base

CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_legales ENABLE ROW LEVEL SECURITY;
ALTER TABLE acta_entrega_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_empleados_policy ON empleados;
CREATE POLICY tenant_empleados_policy ON empleados
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_marcaciones_policy ON marcaciones;
CREATE POLICY tenant_marcaciones_policy ON marcaciones
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_novedades_policy ON novedades_asistencia;
CREATE POLICY tenant_novedades_policy ON novedades_asistencia
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_nominas_policy ON nominas;
CREATE POLICY tenant_nominas_policy ON nominas
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_documentos_policy ON documentos_legales;
CREATE POLICY tenant_documentos_policy ON documentos_legales
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_equipos_policy ON acta_entrega_equipos;
CREATE POLICY tenant_equipos_policy ON acta_entrega_equipos
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_audit_policy ON audit_logs;
CREATE POLICY tenant_audit_policy ON audit_logs
  USING (tenant_id = app_current_tenant_id() OR tenant_id IS NULL)
  WITH CHECK (tenant_id = app_current_tenant_id() OR tenant_id IS NULL);

CREATE OR REPLACE FUNCTION prevent_update_closed_nomina()
RETURNS trigger AS $$
BEGIN
  IF OLD.estado = 'cerrada' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Nomina cerrada inmutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_update_closed_nomina ON nominas;
CREATE TRIGGER trg_prevent_update_closed_nomina
  BEFORE UPDATE ON nominas
  FOR EACH ROW
  EXECUTE FUNCTION prevent_update_closed_nomina();

INSERT INTO parametros_legales (
  tenant_id, anio, pais, salario_basico, aporte_personal_pct, aporte_patronal_pct,
  tabla_impuesto_renta, decimo_cuarto_costa_mes, decimo_cuarto_sierra_mes,
  jornada_maxima_semanal, fuente, vigente
)
VALUES (
  NULL, 2026, 'EC', 460.00, 0.0945, 0.1115,
  '[
    {"from":0,"to":12208,"rate":0,"baseTax":0},
    {"from":12208,"to":15188,"rate":0.05,"baseTax":0},
    {"from":15188,"to":19572,"rate":0.10,"baseTax":148.95},
    {"from":19572,"to":23950,"rate":0.12,"baseTax":587.15},
    {"from":23950,"to":41545,"rate":0.15,"baseTax":1112.53},
    {"from":41545,"to":45820,"rate":0.20,"baseTax":3751.63},
    {"from":45820,"to":55645,"rate":0.25,"baseTax":4606.23},
    {"from":55645,"to":72545,"rate":0.30,"baseTax":7062.23},
    {"from":72545,"to":102130,"rate":0.35,"baseTax":12132.23},
    {"from":102130,"to":null,"rate":0.37,"baseTax":22486.98}
  ]'::jsonb,
  3, 8, 40, 'pendiente_validacion_oficial', true
)
ON CONFLICT (tenant_id, anio, pais) DO NOTHING;

INSERT INTO perfiles_bancarios (
  tenant_id, banco_codigo, banco_nombre, delimiter, encoding, date_format,
  include_header, include_trailer, field_map, activo
)
VALUES
  (NULL, '2011', 'PICHINCHA', ';', 'utf8', 'YYYYMMDD', true, true, '{"profile":"PICHINCHA"}'::jsonb, true),
  (NULL, '2009', 'GUAYAQUIL', ';', 'utf8', 'YYYYMMDD', true, true, '{"profile":"GUAYAQUIL"}'::jsonb, true),
  (NULL, '2017', 'PRODUBANCO', ';', 'utf8', 'YYYYMMDD', true, true, '{"profile":"PRODUBANCO"}'::jsonb, true)
ON CONFLICT (tenant_id, banco_codigo) DO NOTHING;

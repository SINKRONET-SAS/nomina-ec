-- HAIKY fase 28-34 - Parametrizacion operativa de Nomina-Ec

CREATE TABLE IF NOT EXISTS configuration_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL DEFAULT 'tenant',
  catalog_type VARCHAR(80) NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'borrador',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS configuration_catalogs_unique_scope
  ON configuration_catalogs (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), catalog_type, code);
CREATE INDEX IF NOT EXISTS configuration_catalogs_tenant_type_status_idx
  ON configuration_catalogs (tenant_id, catalog_type, status);

CREATE TABLE IF NOT EXISTS legal_parameter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL DEFAULT 'EC',
  region_code VARCHAR(40) NOT NULL DEFAULT 'NACIONAL',
  period_year INTEGER NOT NULL,
  parameter_key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  unit VARCHAR(40) NOT NULL DEFAULT 'decimal',
  rounding_mode VARCHAR(40) NOT NULL DEFAULT 'half_up_2',
  validation_status VARCHAR(60) NOT NULL DEFAULT 'pendiente_validacion_oficial',
  source_name VARCHAR(180) NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_date DATE NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  notes TEXT NOT NULL DEFAULT '',
  approved_by UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_parameter_versions_unique_scope
  ON legal_parameter_versions (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    country_code,
    region_code,
    period_year,
    parameter_key,
    valid_from
  );
CREATE INDEX IF NOT EXISTS legal_parameter_versions_lookup_idx
  ON legal_parameter_versions (tenant_id, period_year, parameter_key, validation_status);

CREATE TABLE IF NOT EXISTS novelty_type_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(60) NOT NULL DEFAULT 'ajuste',
  payroll_impact VARCHAR(40) NOT NULL DEFAULT 'informativo',
  affects_iess BOOLEAN NOT NULL DEFAULT false,
  affects_income_tax BOOLEAN NOT NULL DEFAULT false,
  affects_decimos BOOLEAN NOT NULL DEFAULT false,
  affects_vacation BOOLEAN NOT NULL DEFAULT false,
  affects_bank_file BOOLEAN NOT NULL DEFAULT false,
  requires_evidence BOOLEAN NOT NULL DEFAULT false,
  approval_flow JSONB NOT NULL DEFAULT '{}'::jsonb,
  applicability JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'borrador',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  created_by UUID NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS novelty_type_configs_unique_scope
  ON novelty_type_configs (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code);
CREATE INDEX IF NOT EXISTS novelty_type_configs_lookup_idx
  ON novelty_type_configs (tenant_id, status, category);

CREATE TABLE IF NOT EXISTS organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id UUID NULL,
  unit_type VARCHAR(50) NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost_center_code VARCHAR(80) NOT NULL DEFAULT '',
  manager_user_id UUID NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'activo',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_units_unique_tenant_code
  ON organization_units (tenant_id, code);
CREATE INDEX IF NOT EXISTS organization_units_lookup_idx
  ON organization_units (tenant_id, unit_type, status);

CREATE TABLE IF NOT EXISTS work_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  min_accuracy_meters INTEGER NOT NULL DEFAULT 50,
  requires_photo BOOLEAN NOT NULL DEFAULT true,
  allows_offline BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(30) NOT NULL DEFAULT 'activo',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_zones_unique_tenant_code
  ON work_zones (tenant_id, code);
CREATE INDEX IF NOT EXISTS work_zones_lookup_idx
  ON work_zones (tenant_id, status);

CREATE TABLE IF NOT EXISTS work_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  shift_type VARCHAR(60) NOT NULL DEFAULT 'ordinaria',
  weekly_hours NUMERIC(6, 2) NOT NULL DEFAULT 40,
  start_time VARCHAR(5) NOT NULL DEFAULT '08:00',
  end_time VARCHAR(5) NOT NULL DEFAULT '17:00',
  break_minutes INTEGER NOT NULL DEFAULT 60,
  tolerance_minutes INTEGER NOT NULL DEFAULT 10,
  overtime_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  calendar_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'activo',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_shifts_unique_tenant_code
  ON work_shifts (tenant_id, code);
CREATE INDEX IF NOT EXISTS work_shifts_lookup_idx
  ON work_shifts (tenant_id, status, shift_type);

CREATE TABLE IF NOT EXISTS tenant_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step_code VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  completed_by UUID NULL,
  completed_at TIMESTAMPTZ NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, step_code)
);

CREATE INDEX IF NOT EXISTS tenant_onboarding_steps_lookup_idx
  ON tenant_onboarding_steps (tenant_id, status);

INSERT INTO configuration_catalogs (scope, catalog_type, code, name, description, status, payload)
VALUES
  ('global', 'tipo_jornada', 'ordinaria', 'Jornada ordinaria', 'Jornada ordinaria diurna de referencia.', 'activo', '{"weeklyHours":40}'::jsonb),
  ('global', 'tipo_jornada', 'rotativa', 'Jornada rotativa', 'Jornada por turnos rotativos.', 'activo', '{"requiresCalendar":true}'::jsonb),
  ('global', 'tipo_novedad_base', 'anticipo', 'Anticipo', 'Descuento por anticipo aprobado.', 'activo', '{"payrollImpact":"descuento"}'::jsonb),
  ('global', 'tipo_novedad_base', 'hora_extra_50', 'Hora extra 50%', 'Ingreso por hora suplementaria.', 'activo', '{"payrollImpact":"ingreso","affectsIess":true}'::jsonb)
ON CONFLICT DO NOTHING;

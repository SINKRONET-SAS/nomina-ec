CREATE TABLE IF NOT EXISTS route_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  organization_unit_id UUID NULL REFERENCES organization_units(id) ON DELETE SET NULL ON UPDATE CASCADE,
  work_zone_id UUID NULL REFERENCES work_zones(id) ON DELETE SET NULL ON UPDATE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  client_name VARCHAR(160) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 120,
  min_accuracy_meters INTEGER NOT NULL DEFAULT 80,
  requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
  requires_qr BOOLEAN NOT NULL DEFAULT FALSE,
  allows_unplanned BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(30) NOT NULL DEFAULT 'activo',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_sites_status_check CHECK (status IN ('activo', 'inactivo', 'archivado')),
  CONSTRAINT route_sites_radius_check CHECK (radius_meters > 0 AND min_accuracy_meters > 0),
  CONSTRAINT route_sites_valid_range_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS route_sites_unique_tenant_code
  ON route_sites (tenant_id, code);
CREATE INDEX IF NOT EXISTS route_sites_unit_status_idx
  ON route_sites (tenant_id, organization_unit_id, status);
CREATE INDEX IF NOT EXISTS route_sites_status_valid_idx
  ON route_sites (tenant_id, status, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS route_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE ON UPDATE CASCADE,
  period_id UUID NULL REFERENCES payroll_periods(id) ON DELETE SET NULL ON UPDATE CASCADE,
  operational_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  allow_reorder BOOLEAN NOT NULL DEFAULT TRUE,
  allow_unplanned BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(40) NOT NULL DEFAULT 'pwa',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_days_status_check CHECK (status IN ('planned', 'in_progress', 'completed', 'exception_pending', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS route_days_unique_employee_date
  ON route_days (tenant_id, empleado_id, operational_date);
CREATE INDEX IF NOT EXISTS route_days_date_status_idx
  ON route_days (tenant_id, operational_date, status);
CREATE INDEX IF NOT EXISTS route_days_period_employee_idx
  ON route_days (tenant_id, period_id, empleado_id);

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  route_day_id UUID NOT NULL REFERENCES route_days(id) ON DELETE CASCADE ON UPDATE CASCADE,
  site_id UUID NULL REFERENCES route_sites(id) ON DELETE SET NULL ON UPDATE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  planned_start_time VARCHAR(5) NULL,
  planned_end_time VARCHAR(5) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  is_unplanned BOOLEAN NOT NULL DEFAULT FALSE,
  unplanned_name VARCHAR(160) NOT NULL DEFAULT '',
  unplanned_address TEXT NOT NULL DEFAULT '',
  required_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  omitted_at TIMESTAMPTZ NULL,
  omission_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_stops_status_check CHECK (status IN ('pending', 'in_site', 'completed', 'omitted', 'out_of_zone', 'exception_pending', 'cancelled')),
  CONSTRAINT route_stops_sequence_check CHECK (sequence_order > 0)
);

CREATE INDEX IF NOT EXISTS route_stops_day_status_idx
  ON route_stops (tenant_id, route_day_id, status);
CREATE INDEX IF NOT EXISTS route_stops_site_status_idx
  ON route_stops (tenant_id, site_id, status);

CREATE TABLE IF NOT EXISTS route_visit_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE ON UPDATE CASCADE,
  route_day_id UUID NOT NULL REFERENCES route_days(id) ON DELETE CASCADE ON UPDATE CASCADE,
  route_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE ON UPDATE CASCADE,
  site_id UUID NULL REFERENCES route_sites(id) ON DELETE SET NULL ON UPDATE CASCADE,
  period_id UUID NULL REFERENCES payroll_periods(id) ON DELETE SET NULL ON UPDATE CASCADE,
  operational_date DATE NOT NULL,
  mark_type VARCHAR(20) NOT NULL,
  device_timestamp TIMESTAMPTZ NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  accuracy_meters DECIMAL(10, 2) NULL,
  within_geofence BOOLEAN NOT NULL DEFAULT TRUE,
  distance_meters DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'valid',
  evidence_url TEXT NULL,
  comment TEXT NOT NULL DEFAULT '',
  source VARCHAR(40) NOT NULL DEFAULT 'mobile',
  audit_correlation_id VARCHAR(120) NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_visit_marks_type_check CHECK (mark_type IN ('arrival', 'departure')),
  CONSTRAINT route_visit_marks_status_check CHECK (status IN ('valid', 'out_of_zone', 'pending_review', 'rejected'))
);

CREATE INDEX IF NOT EXISTS route_visit_marks_employee_date_idx
  ON route_visit_marks (tenant_id, empleado_id, operational_date);
CREATE INDEX IF NOT EXISTS route_visit_marks_stop_idx
  ON route_visit_marks (tenant_id, route_day_id, route_stop_id);
CREATE INDEX IF NOT EXISTS route_visit_marks_site_date_idx
  ON route_visit_marks (tenant_id, site_id, operational_date);

CREATE TABLE IF NOT EXISTS route_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE ON UPDATE CASCADE,
  route_day_id UUID NULL REFERENCES route_days(id) ON DELETE CASCADE ON UPDATE CASCADE,
  route_stop_id UUID NULL REFERENCES route_stops(id) ON DELETE SET NULL ON UPDATE CASCADE,
  visit_mark_id UUID NULL REFERENCES route_visit_marks(id) ON DELETE SET NULL ON UPDATE CASCADE,
  period_id UUID NULL REFERENCES payroll_periods(id) ON DELETE SET NULL ON UPDATE CASCADE,
  operational_date DATE NOT NULL,
  exception_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
  reason TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_exceptions_status_check CHECK (status IN ('pending_review', 'approved', 'rejected', 'resolved'))
);

CREATE INDEX IF NOT EXISTS route_exceptions_status_date_idx
  ON route_exceptions (tenant_id, status, operational_date);
CREATE INDEX IF NOT EXISTS route_exceptions_employee_date_idx
  ON route_exceptions (tenant_id, empleado_id, operational_date);
CREATE INDEX IF NOT EXISTS route_exceptions_day_idx
  ON route_exceptions (tenant_id, route_day_id);

ALTER TABLE route_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_visit_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_route_sites_policy ON route_sites;
CREATE POLICY tenant_route_sites_policy ON route_sites
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_route_days_policy ON route_days;
CREATE POLICY tenant_route_days_policy ON route_days
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_route_stops_policy ON route_stops;
CREATE POLICY tenant_route_stops_policy ON route_stops
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_route_visit_marks_policy ON route_visit_marks;
CREATE POLICY tenant_route_visit_marks_policy ON route_visit_marks
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_route_exceptions_policy ON route_exceptions;
CREATE POLICY tenant_route_exceptions_policy ON route_exceptions
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

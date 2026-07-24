CREATE TABLE IF NOT EXISTS roles_anticipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
  anio integer NOT NULL,
  mes integer NOT NULL,
  fecha_corte date NOT NULL,
  estado varchar(30) NOT NULL DEFAULT 'borrador',
  descripcion varchar(240) NOT NULL DEFAULT '',
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  approved_at timestamptz,
  closed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_anticipos_periodo_chk CHECK (anio BETWEEN 2020 AND 2100 AND mes BETWEEN 1 AND 12),
  CONSTRAINT roles_anticipos_estado_chk CHECK (estado IN ('borrador', 'aprobado', 'cerrado', 'anulado')),
  CONSTRAINT roles_anticipos_unique_period UNIQUE (tenant_id, anio, mes, fecha_corte)
);

CREATE TABLE IF NOT EXISTS roles_anticipos_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles_anticipos(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  monto numeric(12,2) NOT NULL,
  tipo_novedad varchar(80) NOT NULL DEFAULT 'bono_desempeno',
  nombre_bonificacion varchar(160) NOT NULL DEFAULT '',
  estado varchar(30) NOT NULL DEFAULT 'pendiente',
  beneficio_id uuid REFERENCES beneficios_empleados(id) ON DELETE SET NULL,
  bonificacion_novedad_id uuid REFERENCES novedades_asistencia(id) ON DELETE SET NULL,
  decidido_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  decidido_en timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_anticipos_detalle_monto_chk CHECK (monto > 0),
  CONSTRAINT roles_anticipos_detalle_estado_chk CHECK (estado IN ('pendiente', 'aprobado', 'descontar', 'bonificar', 'anulado')),
  CONSTRAINT roles_anticipos_detalle_unique_employee UNIQUE (role_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS roles_anticipos_tenant_period_idx
  ON roles_anticipos (tenant_id, anio, mes, estado);
CREATE INDEX IF NOT EXISTS roles_anticipos_detalle_role_idx
  ON roles_anticipos_detalle (tenant_id, role_id, estado);

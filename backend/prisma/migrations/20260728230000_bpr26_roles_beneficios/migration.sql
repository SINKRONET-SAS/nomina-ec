-- BPR26: roles de pago de beneficios legales de Ecuador.
-- Rollback documentado: DROP TABLE roles_beneficios_detalle; DROP TABLE roles_beneficios;
CREATE TABLE IF NOT EXISTS roles_beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_beneficio varchar(50) NOT NULL,
  anio integer NOT NULL,
  region varchar(40) NOT NULL DEFAULT '',
  fecha_pago date NOT NULL,
  periodo_desde date NOT NULL,
  periodo_hasta date NOT NULL,
  estado varchar(30) NOT NULL DEFAULT 'borrador',
  descripcion varchar(240) NOT NULL DEFAULT '',
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_provision numeric(12,2) NOT NULL DEFAULT 0,
  total_ajuste numeric(12,2) NOT NULL DEFAULT 0,
  total_pago numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  approved_at timestamptz,
  closed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_beneficios_anio_chk CHECK (anio BETWEEN 2020 AND 2100),
  CONSTRAINT roles_beneficios_tipo_chk CHECK (tipo_beneficio IN ('decimo_tercero','decimo_cuarto','participacion_laboral','salario_digno','fondos_reserva')),
  CONSTRAINT roles_beneficios_estado_chk CHECK (estado IN ('borrador','aprobado','cerrado','anulado')),
  CONSTRAINT roles_beneficios_periodo_chk CHECK (periodo_desde <= periodo_hasta),
  CONSTRAINT roles_beneficios_totales_chk CHECK (total_provision >= 0 AND total_pago >= 0)
);

CREATE TABLE IF NOT EXISTS roles_beneficios_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles_beneficios(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  dias integer NOT NULL DEFAULT 0,
  monto_provision numeric(12,2) NOT NULL DEFAULT 0,
  monto_ajuste numeric(12,2) NOT NULL DEFAULT 0,
  monto_pago numeric(12,2) NOT NULL DEFAULT 0,
  base_pago numeric(12,2) NOT NULL DEFAULT 0,
  sbu_provision numeric(12,2),
  sbu_pago numeric(12,2),
  modalidad varchar(40) NOT NULL DEFAULT '',
  destino varchar(30) NOT NULL DEFAULT 'empleado',
  estado varchar(30) NOT NULL DEFAULT 'pendiente',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_beneficios_detalle_estado_chk CHECK (estado IN ('pendiente','aprobado','anulado')),
  CONSTRAINT roles_beneficios_detalle_montos_chk CHECK (monto_provision >= 0 AND monto_pago >= 0),
  CONSTRAINT roles_beneficios_detalle_unique_employee UNIQUE (role_id, empleado_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_beneficios_unico_activo_idx
  ON roles_beneficios (tenant_id, tipo_beneficio, anio, region)
  WHERE estado IN ('borrador','aprobado','cerrado');
CREATE INDEX IF NOT EXISTS roles_beneficios_tenant_fecha_idx
  ON roles_beneficios (tenant_id, fecha_pago, estado);
CREATE INDEX IF NOT EXISTS roles_beneficios_detalle_tenant_role_idx
  ON roles_beneficios_detalle (tenant_id, role_id, estado);

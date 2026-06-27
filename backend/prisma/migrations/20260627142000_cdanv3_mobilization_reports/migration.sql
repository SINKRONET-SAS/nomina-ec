CREATE TABLE IF NOT EXISTS informe_movilizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  periodo VARCHAR(7) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  total_usd NUMERIC(10,2) NOT NULL CHECK (total_usd >= 0),
  dias INTEGER NOT NULL CHECK (dias >= 0),
  detalle_json JSONB NOT NULL DEFAULT '[]',
  anticipo_generado_usd NUMERIC(10,2),
  aprobado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobado_at TIMESTAMPTZ,
  rechazo_motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, empleado_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_informe_movilizacion_tenant_estado
  ON informe_movilizacion (tenant_id, estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_informe_movilizacion_empleado_periodo
  ON informe_movilizacion (empleado_id, periodo);

-- Permite que una linea de rol parcial genere simultaneamente un ingreso
-- (novedad aprobada) y un anticipo aprobado para descontar en el cierre.
ALTER TABLE roles_anticipos_detalle
  DROP CONSTRAINT IF EXISTS roles_anticipos_detalle_estado_chk;

ALTER TABLE roles_anticipos_detalle
  ADD CONSTRAINT roles_anticipos_detalle_estado_chk
  CHECK (estado IN ('pendiente', 'aprobado', 'descontar', 'bonificar', 'bonificar_descontar', 'anulado'));

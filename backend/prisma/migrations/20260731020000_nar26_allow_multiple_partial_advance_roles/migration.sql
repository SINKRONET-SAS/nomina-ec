-- Un mismo período puede tener varios roles parciales de anticipos/bonificaciones.
-- La unicidad se conserva por línea dentro de cada rol, no entre roles del período.
ALTER TABLE roles_anticipos
  DROP CONSTRAINT IF EXISTS roles_anticipos_unique_period;

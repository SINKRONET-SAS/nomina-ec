-- ERPC26: repara descuentos de roles de anticipos reabiertos que conservaron
-- un beneficio anulado o descontado mientras la linea aplicada seguia activa.
--
-- Rollback documentado (solo antes de recalcular o cerrar nuevamente la nomina):
-- 1. Seleccionar beneficios con metadata->'lastAdvanceRoleDiscountRepair'.
-- 2. Restaurar estado y saldo desde estadoAnterior/saldoAnterior.
-- 3. Concatenar descuentosRetirados nuevamente en descuentosNomina y retirar
--    lastAdvanceRoleDiscountRepair. No ejecutar el rollback despues de un nuevo
--    calculo porque los movimientos posteriores ya son evidencia contable vigente.
--
-- WITH repair AS (
--   SELECT id, metadata->'lastAdvanceRoleDiscountRepair' AS data
--   FROM beneficios_empleados
--   WHERE metadata ? 'lastAdvanceRoleDiscountRepair'
-- )
-- UPDATE beneficios_empleados AS benefit
-- SET estado = repair.data->>'estadoAnterior',
--     saldo_pendiente = (repair.data->>'saldoAnterior')::numeric,
--     metadata = jsonb_set(
--       benefit.metadata - 'lastAdvanceRoleDiscountRepair',
--       '{descuentosNomina}',
--       COALESCE(benefit.metadata->'descuentosNomina', '[]'::jsonb)
--         || COALESCE(repair.data->'descuentosRetirados', '[]'::jsonb),
--       true
--     ),
--     updated_at = NOW()
-- FROM repair
-- WHERE benefit.id = repair.id;
WITH affected_benefits AS (
  SELECT
    b.id,
    b.estado,
    b.monto_total,
    b.saldo_pendiente,
    b.cuota_mensual,
    b.metadata,
    CONCAT(r.anio, '-', LPAD(r.mes::text, 2, '0')) AS payroll_period,
    COALESCE((
      SELECT SUM((movement->>'monto')::numeric)
      FROM jsonb_array_elements(COALESCE(b.metadata->'descuentosNomina', '[]'::jsonb)) AS movement
      WHERE movement->>'periodo' = CONCAT(r.anio, '-', LPAD(r.mes::text, 2, '0'))
        AND (movement->>'monto') ~ '^[0-9]+([.][0-9]+)?$'
    ), 0) AS applied_amount,
    COALESCE((
      SELECT jsonb_agg(movement)
      FROM jsonb_array_elements(COALESCE(b.metadata->'descuentosNomina', '[]'::jsonb)) AS movement
      WHERE COALESCE(movement->>'periodo', '') <> CONCAT(r.anio, '-', LPAD(r.mes::text, 2, '0'))
    ), '[]'::jsonb) AS remaining_discounts,
    COALESCE((
      SELECT jsonb_agg(movement)
      FROM jsonb_array_elements(COALESCE(b.metadata->'descuentosNomina', '[]'::jsonb)) AS movement
      WHERE movement->>'periodo' = CONCAT(r.anio, '-', LPAD(r.mes::text, 2, '0'))
    ), '[]'::jsonb) AS removed_discounts
  FROM beneficios_empleados b
  JOIN roles_anticipos_detalle d
    ON d.tenant_id = b.tenant_id
   AND d.beneficio_id = b.id
  JOIN roles_anticipos r
    ON r.tenant_id = d.tenant_id
   AND r.id = d.role_id
  JOIN payroll_periods pp
    ON pp.tenant_id = r.tenant_id
   AND pp.id = r.payroll_period_id
  WHERE COALESCE(b.metadata->>'source', '') = 'rol_anticipos'
    AND d.estado IN ('descontar', 'bonificar_descontar')
    AND r.estado IN ('aprobado', 'cerrado')
    AND pp.status <> 'closed'
    AND b.estado IN ('anulado', 'descontado')
)
UPDATE beneficios_empleados AS benefit
SET estado = 'aprobado',
    saldo_pendiente = LEAST(
      affected.monto_total,
      CASE
        WHEN affected.applied_amount > 0 THEN affected.saldo_pendiente + affected.applied_amount
        WHEN affected.saldo_pendiente <= 0 THEN GREATEST(affected.cuota_mensual, affected.monto_total)
        ELSE affected.saldo_pendiente
      END
    ),
    metadata = jsonb_set(
      (COALESCE(benefit.metadata, '{}'::jsonb) - 'ultimoDescuento')
        || jsonb_build_object(
          'lastAdvanceRoleDiscountRepair',
          jsonb_build_object(
            'periodo', affected.payroll_period,
            'estadoAnterior', affected.estado,
            'saldoAnterior', affected.saldo_pendiente,
            'descuentosRetirados', affected.removed_discounts,
            'montoRestaurado', CASE
              WHEN affected.applied_amount > 0 THEN affected.applied_amount
              WHEN affected.saldo_pendiente <= 0 THEN affected.monto_total
              ELSE 0
            END,
            'at', NOW()
          )
        ),
      '{descuentosNomina}',
      affected.remaining_discounts,
      true
    ),
    updated_at = NOW()
FROM affected_benefits AS affected
WHERE benefit.id = affected.id;

# BAI26-01 - Cumplimiento legal Ecuador

- **Plan**: `HAIKY-BENEFICIOS-ANTICIPOS-INTEGRAL-2026`
- **Codigo fase**: `BAI26-01`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `BAI26-00` firmado

## Objetivo

Implementar validaciones de cumplimiento legal Ecuador para anticipos y prestamos segun Codigo del Trabajo.

## Tareas

### BAI26-01-T1: Limite Art. 91 - Prestamos max 10%

- En `calculoNominaService.js`, al calcular deducciones, validar que la suma de cuotas de prestamos no exceda el 10% del ingreso bruto mensual del empleado.
- Si excede, reducir proporcionalmente las cuotas o emitir advertencia en `detalle_calculo`.
- Loguear con correlationId.

### BAI26-01-T2: Validacion Art. 83 - Remuneracion liquida

- Verificar que los anticipos descontados no dejen al empleado con remuneracion liquida negativa despues de deducciones obligatorias (IESS, impuesto renta).
- Agregar campo `limite_deduccion_anticipos` calculado dinamicamente.

### BAI26-01-T3: Consentimiento del trabajador

- Nueva migracion: agregar `consentimiento_en TIMESTAMPTZ` y `consentimiento_ref VARCHAR(500)` a `beneficios_empleados`.
- Actualizar `normalizePayload()` para aceptar estos campos.
- No permitir aprobar beneficio sin consentimiento registrado.

### BAI26-01-T4: Tabla de log de deducciones

- Nueva migracion: crear tabla `beneficio_deducciones_log`:
  - `id UUID PK`, `beneficio_id FK`, `nomina_id FK`, `monto DECIMAL(12,2)`, `saldo_antes DECIMAL(12,2)`, `saldo_despues DECIMAL(12,2)`, `created_at TIMESTAMPTZ`
- Modificar `cerrarMes` para insertar registro en esta tabla al descontar.

### BAI26-01-T5: Exposicion frontend

- Mostrar campo consentimiento en formulario de edicion/creacion.
- Mostrar historial de deducciones en detalle del beneficio.
- Indicador visual cuando un beneficio excede limites legales.

## Archivos a modificar

- `backend/src/services/calculoNominaService.js`
- `backend/src/services/beneficioEmpleadoService.js`
- `backend/src/controllers/nominaController.js`
- `backend/prisma/migrations/` (nueva)
- `frontend-web/src/pages/Nomina/Beneficios.jsx`
- `frontend-web/src/services/beneficiosApi.js`

## Validacion de cierre

- [ ] Art. 91: prestamos capped a 10% ingreso bruto
- [ ] Art. 83: anticipos no dejan liquido negativo
- [ ] Campo consentimiento funcional en UI
- [ ] Tabla beneficio_deducciones_log creada y poblada en cerrarMes
- [ ] node --check PASS
- [ ] Backend tests PASS

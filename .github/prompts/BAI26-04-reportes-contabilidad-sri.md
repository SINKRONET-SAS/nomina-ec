# BAI26-04 - Reportes y contabilidad SRI

- **Plan**: `HAIKY-BENEFICIOS-ANTICIPOS-INTEGRAL-2026`
- **Codigo fase**: `BAI26-04`
- **Estado**: `pending`
- **Prerequisito**: AuditLock `BAI26-03` firmado

## Objetivo

Asegurar que anticipos y prestamos aparezcan correctamente en reportes SRI (RDEP, Formulario 107) y mejorar integridad de datos de reporte.

## Tareas

### BAI26-04-T1: Anticipos/prestamos en RDEP

- En `sriRdepGenerator.js`, incluir anticipos y prestamos como descuentos del empleado.
- Verificar que los montos cuadren con lo descontado en nomina cerrada.
- Agregar campo en XML RDEP bajo seccion de descuentos.

### BAI26-04-T2: Anticipos/prestamos en Formulario 107

- En `sriFormulario107Service.js`, incluir anticipos y prestamos en la seccion de retenciones y descuentos.
- Generar PDF con lineas separadas para anticipos y prestamos.

### BAI26-04-T3: Schema validation para metadata JSONB

- Definir schema permitido para `metadata` en beneficios_empleados:
  - Claves permitidas: `source`, `advanceRoleLineId`, `ultimoDescuento`, `descuentosNomina`
  - Validar en `normalizePayload()` y rechazar claves desconocidas.

### BAI26-04-T4: Paginacion backend en reporte filtrado

- En `advancePayrollService.js`, agregar soporte de paginacion para `listRuns()`.
- Limitar resultado a 500 registros por pagina.
- Actualizar `downloadAdvanceReport` para streaming en lugar de carga completa en memoria.

## Archivos a modificar

- `backend/src/services/sriRdepGenerator.js`
- `backend/src/services/sriFormulario107Service.js`
- `backend/src/services/beneficioEmpleadoService.js`
- `backend/src/services/advancePayrollService.js`
- `backend/src/controllers/advancePayrollController.js`

## Validacion de cierre

- [ ] RDEP incluye anticipos/prestamos descontados
- [ ] Formulario 107 incluye lineas de anticipos/prestamos
- [ ] metadata JSONB validada con schema
- [ ] Reporte filtrado paginado en backend
- [ ] Backend tests PASS
- [ ] node --check PASS

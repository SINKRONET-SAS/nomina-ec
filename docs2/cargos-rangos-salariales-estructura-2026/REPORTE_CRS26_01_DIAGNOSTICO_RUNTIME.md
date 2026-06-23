# Reporte CRS26-01 - Diagnostico runtime de cargos

Fecha local: 2026-06-22.

## Objetivo

Diagnosticar todos los puntos donde el sistema usa `cargo`, `position` o alcance por puesto antes de crear el modelo runtime de cargos con rango salarial.

## Hallazgo principal

El sistema usa `empleados.cargo` como texto libre y lo replica como `position` en importacion. No existe entidad de cargo/puesto ni relacion fuerte con `organization_units`. Esto impide validar rango salarial, controlar eliminacion por consumo y agrupar reportes de forma confiable.

## Consumidores identificados

| Area | Archivo | Uso actual | Riesgo |
|------|---------|------------|--------|
| Modelo | `backend/prisma/schema.prisma` | `Employee.cargo String` sin FK. | Sin integridad referencial ni rango salarial. |
| Alta empleado | `backend/src/controllers/empleadoController.js` | Inserta `cargo || ''`. | Nuevos cargos escritos manualmente. |
| Edicion empleado | `backend/src/controllers/empleadoController.js` | Permite actualizar `cargo` libremente. | Inconsistencia con estructura y reportes. |
| Lista empleado | `backend/src/controllers/empleadoController.js` | Devuelve `cargo`. | No puede mostrar codigo/rango/unidad del cargo real. |
| PWA empleado | `frontend-web/src/pages/Empleados/NuevoEmpleado.jsx` | Campo `Cargo` manual. | Usuario no consume tabla de cargos. |
| Importacion | `backend/src/services/employeeImportService.js` | `position`/`cargo` se guarda como string. | Cargas masivas sin validacion de cargo/rango. |
| Novedades por lote | `backend/src/services/monthlyPeriodService.js` | `scopeType=position` filtra `AND cargo = $2`. | Alcance fragil ante cambios de nombre. |
| Reportes | `backend/src/services/payrollReportService.js` | Filtra/exporta `e.cargo`. | No agrupa contra estructura real. |
| Contratos | `backend/src/services/templateGenerator.js` | Usa `empleado.cargo`. | Debe preservar fallback historico. |
| App/invitaciones | `backend/src/services/employeeAppInviteService.js` | Expone `e.cargo`. | Puede mantener etiqueta, pero debe provenir del cargo real. |
| API externa | `backend/src/controllers/externalApiController.js` | Lista `cargo`. | Debe sumar identificador/codigo de cargo sin romper contrato. |

## Estado de estructura organizativa

`organization_units` ya existe con `tenant_id`, `code`, `name`, `unit_type`, `cost_center_code`, `work_zone_id`, estado y vigencia. CRS26 debe consumir esta tabla, no duplicarla.

## Estrategia aprobada para implementacion

1. Crear tabla `job_positions` en ingles tecnico, con etiquetas en espanol en UI.
2. Relacionar cada cargo con `organization_units.id`.
3. Agregar `empleados.position_id` nullable al inicio para migracion gradual.
4. Mantener `empleados.cargo` como snapshot historico visible.
5. Al crear/editar empleado, resolver `position_id` y escribir snapshot `cargo = job_positions.name`.
6. Importacion debe aceptar `positionCode`, `position`, `cargo` y resolver por codigo/nombre.
7. Novedades por alcance `position` deben aceptar id/codigo/nombre y filtrar por `position_id` con fallback temporal por `cargo`.
8. Reportes deben seleccionar cargo real y usar fallback historico para registros no migrados.

## Politica de rango salarial

Decision CRS26-01 para implementar en CRS26-02/03:

- Por defecto, el sueldo fuera del rango del cargo bloquea alta/edicion/importacion.
- Se deja preparado `allow_salary_exception` en metadata o payload futuro, pero no se habilita excepcion silenciosa.
- Si luego se aprueba excepcion, debe registrar motivo, usuario, fecha y auditoria.

## Riesgos

- Empleados existentes pueden tener cargos con variaciones de escritura.
- Lotes de novedades historicos por string deben seguir funcionando.
- Reportes de nomina cerrada no deben cambiar interpretacion historica.
- El seed demo debe crear cargos antes de empleados para que la demo siga operable.

## Cierre CRS26-01

CRS26-01 queda cerrado como diagnostico runtime sin modificar base de datos ni codigo operativo.

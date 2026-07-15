# PLAN HAIKY - Novedades de empleado y recalculo selectivo 2026

Codigo de plan: NER26
Fuente de reglas: RULES.md
Lock de gobierno: .vscode/AuditLock.json
Repositorio revisado: SINKRONET-SAS/nomina-ec, rama publica observada `codex/haiky-render-legal-plan` y checkout local `/workspace/nomina-ec`.
Fecha de baseline: 2026-07-15

## 1. Diagnostico operativo

El fallo reportado ocurre cuando RRHH necesita modificar novedades de un empleado despues de eliminar o revertir su calculo individual. El sistema conserva controles pensados para lote/periodo completo y la operacion termina tratandose como impacto global: obliga a eliminar o recalcular todos los calculos del periodo, incluso los de otros empleados.

Hallazgos de codigo que orientan el plan:

- `backend/src/controllers/novedadController.js` bloquea editar/eliminar novedades si existe una linea `payroll_calculation_lines` con `source = 'novedad'` y `source_id = novedad.id`.
- `backend/src/controllers/nominaController.js` reabre periodos y opera nominas por periodo completo, no por empleado.
- `backend/src/services/monthlyPeriodService.js` ya soporta lotes de novedades por `scope_type = employee`, pero el flujo de correccion post-calculo no esta separado de la logica global de periodo.
- `frontend-web/src/pages/Nomina/CerrarMes.jsx` expone acciones de lote/periodo; se requiere accion visible y segura para recalculo selectivo por empleado.

## 2. Objetivo funcional

Permitir que una novedad de un empleado se pueda modificar en un periodo calculado/reabierto sin obligar a eliminar calculos de otros empleados, manteniendo:

- Inmutabilidad de nomina cerrada salvo reapertura controlada.
- Trazabilidad auditable de la invalidacion del calculo individual.
- Recalculo idempotente solo del empleado afectado.
- Bloqueo explicito si la novedad esta consumida por una nomina cerrada no reabierta.
- Mensajes claros en frontend para RRHH.

## 3. Regla de oro de alcance

Ninguna accion de correccion de novedad individual puede ejecutar borrado, reapertura o recalculo masivo si el usuario selecciono un empleado especifico.

El criterio tecnico minimo es que toda consulta destructiva o invalidante incluya simultaneamente:

- `tenant_id`
- `anio`
- `mes`
- `empleado_id`

cuando el flujo sea de correccion individual.

## 4. Fases HAIKY

| Fase | Prioridad | Estado inicial | Objetivo |
| --- | --- | --- | --- |
| NER26-00 | P0 | completed_local | Baseline documental, prompts y AuditLock sin tocar runtime. |
| NER26-01 | P0 | completed_local | Backend para invalidacion/recalculo selectivo por empleado. |
| NER26-02 | P0 | completed_local | Frontend operativo para corregir novedad individual sin impacto global. |
| NER26-03 | P0 | completed_local | QA, regresion multi-empleado, reporte final y AuditLock. |

## 5. Diseno backend propuesto

### 5.1 Servicio nuevo o extension controlada

Crear una funcion transaccional, por ejemplo:

```js
async function invalidateEmployeePayrollForNovelty({ tenantId, employeeId, anio, mes, noveltyId, userId, correlationId, ipAddress, reason })
```

Debe:

1. Validar periodo existente y estado permitido: `calculated`, `reopened` o `calculation_failed`. Si esta `closed`, exigir reapertura controlada previa.
2. Bloquear fila `payroll_periods` con `FOR UPDATE`.
3. Verificar que la novedad pertenece al mismo `tenantId`, `employeeId`, `anio` y `mes`.
4. Localizar solo la nomina del empleado afectado.
5. Eliminar o marcar como invalidas solo las lineas de calculo asociadas a esa nomina/empleado, nunca las de otros empleados.
6. Dejar la novedad editable o devolverla a `pendiente` segun la accion solicitada.
7. Registrar auditoria con `action = 'novedades.empleado.invalidar_calculo'`.
8. Actualizar `payroll_periods.summary` con `lastEmployeePayrollInvalidation` sin cambiar el estado global a abierto si otros empleados siguen calculados.

### 5.2 Contrato de API sugerido

Endpoint sugerido:

```http
POST /api/nomina/:anio/:mes/empleados/:empleadoId/invalidar-calculo
```

Payload:

```json
{
  "novedadId": "uuid-opcional",
  "motivo": "Correccion de novedad aprobada por RRHH"
}
```

Respuesta esperada:

```json
{
  "success": true,
  "scope": "employee",
  "empleadoId": "...",
  "anio": 2026,
  "mes": 6,
  "nominasInvalidas": 1,
  "lineasInvalidas": 3,
  "novedadEditable": true,
  "correlationId": "..."
}
```

### 5.3 Guardas no negociables

- Prohibido usar `DELETE FROM nominas WHERE tenant_id = $1 AND anio = $2 AND mes = $3` sin `empleado_id` en este flujo.
- Prohibido borrar `payroll_calculation_lines` por `batch_id` completo cuando la accion venga de una novedad individual.
- Si hay mas de una nomina impactada, retornar `409` con codigo `NOVEDAD_SCOPE_NO_SELECTIVO`.
- Si el periodo esta cerrado, retornar `409` con codigo `NOMINA_CERRADA_REQUIERE_REAPERTURA`.
- Todo error debe cumplir RULES.md: `code`, `statusCode`, `correlationId`, `userId` cuando exista.

## 6. Diseno frontend propuesto

Agregar accion visible desde novedades operativas o detalle de nomina del empleado:

- Boton: `Corregir novedad de empleado`.
- Confirmacion con empleado, periodo, novedad y advertencia: `Solo se invalidara el calculo de este empleado`.
- Si el backend responde bloqueo por periodo cerrado, mostrar accion siguiente: `Reabrir periodo con motivo`.
- Despues de invalidar, permitir editar la novedad y recalcular solo al empleado si existe endpoint selectivo; si no existe aun, dejar instruccion visible de recalculo controlado.

## 7. Pruebas obligatorias

### Backend

- Editar novedad de empleado A no borra ni invalida nomina de empleado B.
- Eliminar novedad de empleado A no borra lineas de calculo de empleado B.
- Periodo cerrado retorna `NOMINA_CERRADA_REQUIERE_REAPERTURA`.
- Novedad de otro tenant retorna 404/403 sin filtrar informacion.
- Transaccion revierte si falla auditoria o actualizacion de lineas.

### Frontend

- La UI muestra alcance `empleado` antes de confirmar.
- La UI no ofrece accion global cuando el usuario entro desde una novedad individual.
- Errores del backend se muestran con mensaje en espanol y `correlationId`.

### Contratos

- `node --check` en controladores/servicios tocados.
- Jest backend para controlador/servicio nuevo.
- `npm --workspace=frontend-web run build` o check equivalente del proyecto.
- `git diff --check`.
- Validacion UTF-8 sin BOM en archivos modificados.

## 8. Entregables por fase

| Fase | Entregables | Gates |
| --- | --- | --- |
| NER26-00 | Este plan, prompts NER26 y AuditLock actualizado. | JSON parse, UTF-8 sin BOM, `git diff --check`. |
| NER26-01 | Servicio/backend y tests de invalidacion selectiva. | Jest backend, node --check, contratos. |
| NER26-02 | UI de correccion individual y estados de error. | Build frontend, pruebas manuales guiadas. |
| NER26-03 | Reporte final, AuditLock firmado, matriz de riesgos residuales. | Suite minima completa y revision de diffs destructivos. |

## 9. Riesgos y controles

| Riesgo | Control |
| --- | --- |
| Borrado global accidental | Tests que fallen si falta `empleado_id` en queries destructivas del flujo individual. |
| Periodo cerrado mutable | Bloqueo duro hasta reapertura controlada auditada. |
| Descuadres contables | Invalidar lineas del empleado y exigir recalculo/auditoria antes de cierre. |
| Regresion en lotes globales | Mantener endpoints globales existentes y separar nombres/acciones de flujo individual. |
| UI ambigua | Confirmaciones con empleado, periodo y alcance antes de ejecutar. |

## 10. Prompt operativo base para cada fase

1. Leer `RULES.md`, `.vscode/AuditLock.json`, este plan y el prompt de fase.
2. Confirmar que el lock de fase anterior esta firmado.
3. Ejecutar cambios solo del alcance de la fase.
4. No introducir fallos silenciosos ni catches vacios.
5. Exponer frontend si afecta operacion de usuario.
6. Ejecutar gates definidos.
7. Actualizar `AuditLock.json` con fase completada, archivos modificados, checks y firma.
8. Commit con formato: `phase: NER26-XX task: <descripcion>`.

## 11. Cierre local NER26

Estado: `completed-pass`.

Cambios ejecutados:

- Backend agrega invalidacion individual de calculo por empleado desde una novedad consumida.
- Backend agrega recalculo individual de nomina por empleado, con lote de calculo `scope = employee`.
- La invalidacion individual exige simultaneamente `tenant_id`, `anio`, `mes` y `empleado_id` antes de eliminar un rol borrador.
- Las novedades operativas ya no ocultan registros consumidos por rol; ahora muestran accion para liberar solo el calculo del empleado.
- La PWA expone recalculo individual cuando la novedad corregida queda aprobada y el periodo esta reabierto o con fallo de calculo.
- La accion global de cierre mensual queda rotulada como descarte del periodo para evitar confundirla con correccion individual.

Evidencia:

- Reporte final: `docs/novedades-empleado-recalculo-selectivo-2026/REPORTE_NER26_00_03_EJECUCION.md`.
- Lock de gobierno: `.vscode/AuditLock.json`.

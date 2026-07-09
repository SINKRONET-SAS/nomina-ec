# PLAN HAIKY - ORTOGRAFIA, AYUDA, PARAMETROS, PERIODOS Y CONTRATOS 2026

## Identificacion

| Campo | Valor |
|---|---|
| Codigo | OAP26 |
| Estado | ejecutado localmente, QA pendiente de cierre |
| Fecha | 2026-07-09 |
| Producto | SKNOMINA / nomina-ec |
| Reglas base | `RULES.md` |
| Contexto | `.github/CODEX_CONTEXT.md` |

## Fuente del requerimiento

Solicitud del usuario sobre:

- Corregir ortografia visible, incluyendo `Anio` por `Año`.
- Renombrar `Beneficios, anticipos y prestamos` a `Anticipos y préstamos`.
- Renombrar menu `Beneficios y Descuentos` a `Descuento Anticipos`.
- Cambiar validacion de parametros legales a check de responsabilidad del owner, sin dependencia de URL oficial.
- Bloquear modificacion de parametros validados para perfiles distintos a owner/superadmin.
- Validar tipos de contrato aceptados en Ecuador y ampliar plantillas especificas.
- Exponer guia de uso y ayuda al usuario.
- Corregir generacion/edicion/cierre de periodos anuales.
- Hacer visible la seleccion de modelo de contrato en la ficha del empleado, sin atarlo al cargo ni duplicar logica.

## Diagnostico resumido

| ID | Severidad | Hallazgo | Resolucion |
|---|---:|---|---|
| OAP26-F01 | Media | Textos visibles tenian nomenclatura y ortografia inconsistente. | Se ajustaron titulos, menu y campos clave. |
| OAP26-F02 | Alta | La validacion de parametros dependia de referencia/URL externa y demoraba la activacion. | Se agrego check owner y bloqueo RBAC post-validacion. |
| OAP26-F03 | Alta | Periodos anuales podian verse con fecha 31 de diciembre del anio anterior por conversion UTC. | Backend devuelve fechas como `YYYY-MM-DD` y genera de 1 de enero a 31 de diciembre. |
| OAP26-F04 | Media | Periodos solo se insertaban, sin edicion controlada de fechas. | Se agrego endpoint y UI para editar fechas mientras no haya calculo/cierre. |
| OAP26-F05 | Media | Si el owner inicia en mes corriente, no habia cierre masivo de meses previos vacios. | Se agrego cierre de meses previos vacios sin roles ni novedades. |
| OAP26-F06 | Alta | Modelos de contrato eran insuficientes y no estaban expuestos en ficha de empleado. | Se agregaron plantillas 2026 y selector en ficha consumiendo catalogo backend. |
| OAP26-F07 | Media | Asociar plantilla al cargo creaba doble fuente de verdad. | Se retiro la asociacion por cargo; la ficha del empleado define el modelo. |
| OAP26-F08 | Media | No habia guia de uso visible en PWA. | Se agrego pantalla de ayuda y menu. |

## Fases ejecutadas

| Fase | Prioridad | Estado | Entregable |
|---|---:|---|---|
| OAP26-00 | P0 | ejecutada | Baseline, plan, contexto y diagnostico. |
| OAP26-01 | P0 | ejecutada | Periodos anuales, fechas editables y cierre de vacios. |
| OAP26-02 | P0 | ejecutada | Parametros legales validados por owner/superadmin. |
| OAP26-03 | P0 | ejecutada | Tipos y plantillas de contratos Ecuador 2026. |
| OAP26-04 | P1 | ejecutada | UI/UX, ortografia, ayuda y selector en ficha. |
| OAP26-05 | P0 | pendiente QA final | Pruebas, UTF-8, AuditLock, commit y push. |

## Reglas operativas

- No duplicar catalogos de plantillas en frontend; la PWA consume `/api/documentos/contrato/plantillas`.
- No asociar modelo de contrato al cargo/puesto; se define en la ficha del empleado y puede ajustarse al emitir PDF.
- No reactivar edicion de parametros legales validados para perfiles distintos a owner/superadmin.
- No permitir edicion de fechas de periodos con nomina calculada/cerrada o roles existentes.
- No marcar plantillas legales como modelos oficiales sin revision laboral profesional y registro externo SUT/IESS cuando corresponda.
- Mantener textos visibles en espanol tecnico y archivos `.js`, `.md`, `.json` en UTF-8 sin BOM.

## Gates de cierre requeridos

- `backend` tests: `monthlyPeriodService.test.js`, `configurationService.test.js`, `templateGenerator.test.js`, `app.routes.test.js`.
- Prisma validate.
- Build PWA.
- `git diff --check`.
- Escaneo UTF-8 sin BOM y mojibake en archivos modificados.
- Actualizacion de `AuditLock.json`.

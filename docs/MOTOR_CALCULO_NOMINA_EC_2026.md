# Motor de calculo de nomina Ecuador 2026

Estado: operativo con bloqueo productivo legal si los parametros no estan en `validado_oficial`.

## Alcance implementado

El motor principal esta en `backend/src/services/calculoNominaService.js` y calcula una nomina mensual por tenant, anio y mes. Lee empleados activos, novedades aprobadas, beneficios/descuentos aprobados y parametros legales versionados.

El resultado se guarda en `nominas.detalle_calculo` con el desglose auditable usado por roles, reportes Excel/PDF, archivo bancario y cierres.

## Parametros 2026 configurados

| Parametro | Valor usado | Estado | Fuente/criterio registrado |
| --- | ---: | --- | --- |
| SBU | USD 482.00 | fuente oficial identificada, pendiente de aprobacion profesional global | Ministerio del Trabajo, noticia oficial SBU 2026 USD 482 |
| Jornada maxima semanal | 40 horas | pendiente_validacion_oficial | Codigo del Trabajo/normativa laboral vigente por validar |
| Horas mensuales de calculo | 240 | pendiente_validacion_oficial | Criterio operativo historico usado por el sistema |
| Aporte IESS personal | 9.45% | pendiente_validacion_oficial | Requiere evidencia IESS directa vigente 2026 |
| Aporte IESS patronal | 11.15% | pendiente_validacion_oficial | Requiere evidencia IESS directa vigente 2026 |
| Vacaciones | 15 dias desde el primer anio | pendiente_validacion_oficial | Codigo del Trabajo por validar profesionalmente |
| Provision vacaciones | 1/24 de ingresos | pendiente_validacion_oficial | Formula operativa derivada de 15 dias/360 |
| Decimo tercero | 1/12 de ingresos | pendiente_validacion_oficial | Codigo del Trabajo por validar profesionalmente |
| Decimo cuarto | 1/12 de SBU | pendiente_validacion_oficial | Codigo del Trabajo por validar profesionalmente |
| Pago decimo cuarto Costa/Galapagos | Marzo | pendiente_validacion_oficial | Calendario regional por validar |
| Pago decimo cuarto Sierra/Amazonia | Agosto | pendiente_validacion_oficial | Calendario regional por validar |
| Fondos de reserva | 1/12 de ingresos desde mes 13 | pendiente_validacion_oficial | Regla laboral/IESS por validar |
| Impuesto a la renta personas naturales | Tabla 2026 | fuente oficial SRI identificada | Resolucion NAC-DGERCGC25-00000043, Registro Oficial No. 194, 2025-12-30 |

## Tabla IR 2026 usada

| Desde | Hasta | Impuesto fraccion basica | Porcentaje excedente |
| ---: | ---: | ---: | ---: |
| 0 | 12,208 | 0 | 0% |
| 12,208 | 15,549 | 0 | 5% |
| 15,549 | 20,188 | 167 | 10% |
| 20,188 | 26,700 | 631 | 12% |
| 26,700 | 35,136 | 1,412 | 15% |
| 35,136 | 46,575 | 2,678 | 20% |
| 46,575 | 62,005 | 4,965 | 25% |
| 62,005 | 82,679 | 8,823 | 30% |
| 82,679 | 109,956 | 15,025 | 35% |
| 109,956 | Sin limite | 24,572 | 37% |

## Formulas ejecutadas

1. Dias trabajados: dias calendario desde ingreso hasta fin de mes, limitado a 30.
2. Sueldo proporcional: `sueldo_bruto_mensual * dias_trabajados / 30`.
3. Valor hora: `sueldo_bruto_mensual / horas_mensuales`.
4. Horas extra 50%: `minutos_hora_extra_50 / 60 * valor_hora * 1.5`.
5. Horas extra 100%: `minutos_hora_extra_100 / 60 * valor_hora * 2`.
6. Descuento por faltas: `faltas_aprobadas * valor_hora * horas_diarias`.
7. Total ingresos: `sueldo_proporcional + extras_50 + extras_100`.
8. IESS personal: `total_ingresos * 0.0945`.
9. Base imponible IR mensual: `total_ingresos - IESS_personal`.
10. IR mensual: proyecta `base_mensual * 12`, deduce gastos personales anuales del empleado hasta el limite configurado y aplica tabla progresiva anual antes de dividir para 12.
11. Decimo tercero provisionado: `total_ingresos / 12`.
12. Decimo cuarto provisionado: `SBU / 12`.
13. Vacaciones provisionadas: `total_ingresos / 24`.
14. Fondos de reserva: `total_ingresos / 12` si el trabajador ya supera el umbral configurado de 12 meses.
15. Costo empleador: ingresos + aporte patronal + provisiones.
16. Total deducciones: IESS personal + IR + faltas + anticipos + prestamos.
17. Neto a recibir: `total_ingresos - total_deducciones`.

Todos los rubros monetarios se redondean a 2 decimales con `roundMoney`.

## Bloqueo legal productivo

`backend/src/services/legalParameterService.js` bloquea calculos productivos cuando:

- `NODE_ENV=production`, o
- `REQUIRE_VALIDATED_LEGAL_PARAMETERS=true`,

y el estado consolidado de parametros no es exactamente `validado_oficial`.

Mientras IESS y parametros laborales sigan en `pendiente_validacion_oficial`, el sistema debe fallar con `LEGAL_PARAMETERS_NOT_VALIDATED` en produccion. Esta es una barrera deliberada, no un bug.

## Reportes implementados

El endpoint `POST /api/reportes/nomina/exportar` genera:

- `PAYROLL_DETAIL_TABULAR` en XLSX, con una fila por persona y detalle de ingresos, deducciones, provisiones, costo empleador y fuente legal.
- `PAYROLL_SUMMARY` en XLSX o PDF, agrupado por estructura organizativa cuando exista, o por departamento/cargo como respaldo.

Filtros soportados:

- `employeeId`
- `department`
- `position`
- `costCenter`

Cada exportacion registra auditoria con periodo, tipo de reporte, formato, filtros y `correlationId`.

## Brechas que no deben prometerse como cerradas

- No hay confirmacion oficial directa en el repo para promover IESS 9.45%/11.15% a `validado_oficial`.
- El rol PDF por persona existe como contrato de endpoint, pero depende de `rol_pdf_url`; el cierre mensual todavia no genera automaticamente el PDF del rol.
- Los reportes a entidades publicas distintos de RDEP/IESS/archivo bancario deben activarse solo con formato oficial por entidad, actividad economica y periodo.
- La estructura organizativa esta modelada, pero empleados aun guardan `departamento` como texto; falta una relacion fuerte empleado-unidad para reporterias complejas.

## Reconciliacion con diagnostico externo 2026-06-17

Se revisaron los scripts externos de correccion para NominaEC. No se aplicaron literalmente porque pertenecen a otro stack (`Base44`, `pages/Nomina.jsx`, `lib/legal-ecuador.js`) y contienen valores que contradicen la parametrizacion actual de este repo, como SBU 460 y una tabla IR anterior. Se portaron las reglas compatibles al backend actual:

- IR: se agrego `gastos_personales_anuales` por empleado y se deduce del calculo anual hasta el limite parametrizado.
- Horas extra: se agrego `jornada_horas_mensuales` por empleado; contratos `hora` usan el sueldo registrado como valor hora.
- Liquidacion: se corrigio periodo de decimo tercero, indemnizacion por despido intempestivo con minimo 3 meses y tope 25 meses, desahucio para causas aplicables y fondo de reserva proporcional.
- Carga masiva/UI: se agregaron campos para jornada mensual y gastos personales.

No se cambio el aporte IESS personal a 9.95%. El propio diagnostico lo marca como punto critico a validar con contador y este repo mantiene el bloqueo productivo de parametros no validados.

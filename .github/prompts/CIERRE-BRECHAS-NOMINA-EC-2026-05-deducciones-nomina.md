# CBN26-05 - Deducciones de prestamos y anticipos

Actua bajo `RULES.md`.

Objetivo: incluir anticipos y prestamos aprobados de beneficios en el calculo de nomina y conciliacion del neto.

Tareas:
- Determinar motor canonico de calculo de nomina.
- Integrar beneficios aprobados al periodo correspondiente.
- Evitar doble descuento con idempotencia por periodo.
- Auditar deducciones y origen de cada rubro.
- Crear caso dorado con sueldo, IESS, prestamo/anticipo y neto.
- Crear `docs/REPORTE_CBN26_05_DEDUCCIONES_NOMINA.md`.

Validaciones:
- Tests backend de calculo.
- Build frontend si se exponen rubros.
- Comparacion de totales antes/despues.

No hacer:
- No modificar parametros legales fuera del alcance aprobado.

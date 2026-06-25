# ANV1-03 Nomina legal Ecuador

Objetivo: cerrar D13, D14, horas extra e IESS sin romper historicos.

Instrucciones:
- Verificar formulas actuales contra parametros legales versionados y fuente oficial/profesional.
- Implementar validaciones de horas extra semanal y recargos con errores visibles.
- Implementar D13/D14 con periodo, region y snapshot; no recalcular historicos cerrados sin autorizacion.
- Implementar condicion de IESS por afiliacion/tipo relacion si el modelo no existe.
- Agregar migraciones, rollback, pruebas unitarias y detalle de calculo.
- Exponer bloqueos/warnings en PWA cuando una ficha impida calculo correcto.
- Crear reporte de fase.
- Commit esperado: `phase: ANV1-03 task: nomina legal`.

# CBN26-08 - Parametros legales como fuente primaria

Actua bajo `RULES.md`.

Objetivo: corregir `ParametrosLegales.jsx` y el calculo de nomina para que los parametros versionados sean la fuente primaria, no `PARAMETROS_2026` hardcodeado.

Tareas:
- Mapear fuente actual de parametros en frontend y backend.
- Eliminar fallback primario hardcodeado del calculo oficial.
- Mantener fallback tecnico solo bloqueado/no productivo si el gobierno legal lo exige.
- Asegurar vigencia, fuente, responsable y estado de validacion.
- Crear `docs/REPORTE_CBN26_08_PARAMETROS_LEGALES.md`.

Validaciones:
- Tests de calculo con parametros versionados.
- Build frontend.
- Verificar bloqueo productivo si parametros no estan `validado_oficial`.

No hacer:
- No validar oficialmente tasas legales sin fuente y aprobacion profesional.

# OAP26-01 - Periodos anuales y cierre de vacios

Contexto base: `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: corregir generacion anual para que enero inicie el 1 de enero y diciembre cierre el 31 de diciembre del anio seleccionado, sin desfase UTC. Exponer edicion segura de fechas y cierre de meses previos vacios.

Entregables:
- Backend con fechas `YYYY-MM-DD`, endpoint de edicion y cierre de vacios.
- PWA `Nomina > Periodos` con controles visibles y bloqueos claros.
- Tests de servicio y rutas.

No permitir edicion si el periodo esta calculado/cerrado o tiene roles.

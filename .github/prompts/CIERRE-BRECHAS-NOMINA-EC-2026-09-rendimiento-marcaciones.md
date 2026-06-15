# CBN26-09 - Rendimiento de marcaciones y dashboard

Actua bajo `RULES.md`.

Objetivo: evitar cargas masivas innecesarias de marcaciones para dashboard y verificacion de faltantes.

Tareas:
- Reemplazar conteo de marcaciones de hoy basado en 500 registros por consulta filtrada/agregada por fecha y tenant.
- Reemplazar carga de 1000 marcaciones en `verificarMarcacionesFaltantes` por filtro de fecha en origen.
- Medir impacto o documentar conteo de registros evitados.
- Crear `docs/REPORTE_CBN26_09_RENDIMIENTO_MARCACIONES.md`.

Validaciones:
- Tests o smoke de dashboard.
- Build frontend si aplica.
- Verificar que los totales no cambien respecto al comportamiento esperado.

No hacer:
- No modificar estados UI de `Marcaciones.jsx` salvo dependencia estricta.

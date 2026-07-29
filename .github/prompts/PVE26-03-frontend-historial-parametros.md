# PVE26-03 — Historial visible en Valores legales

Lee `RULES.md`, el Plan Haiky PVE26, `CODEX_CONTEXT.md` y los contratos API de `PVE26-02`.

## Tareas

1. Mantener la superficie `Parametrización > Valores legales`.
2. Añadir el botón “Ver historial de versiones” por parámetro.
3. Mostrar versión vigente y anteriores con valor, año, vigencia, estado, fuente, usuario y fecha de validación.
4. Mostrar qué versión será usada en cálculos nuevos y permitir comparar la vigente contra una histórica.
5. Hacer que editar la vigente solicite una fecha de vigencia y comunique que se creará una nueva versión.
6. Permitir restaurar solo mediante una nueva versión, conservando las originales y con confirmación comprensible.
7. Presentar fuente oficial validada y errores accionables; no ocultar la información ni invalidar el documento con advertencias técnicas.

## Salida y puerta de fase

Parseo/build frontend y pruebas de interacción disponibles pasan. No agregar menú ni ruta paralela. Firmar `PVE26-03` antes de la regresión completa.

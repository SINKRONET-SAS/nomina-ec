# PVE26-02 — API de historial y restauración

Lee `RULES.md`, el Plan Haiky PVE26 y la evidencia de `PVE26-01`.

## Tareas

1. Exponer historial de versiones filtrado por parámetro y año, respetando tenant, roles y fuente global.
2. Devolver metadatos legibles: valor, unidad, vigencia, estado, fuente, usuario, fecha de validación, creación, motivo y versión reemplazada.
3. Exponer restauración autorizada como creación de una versión nueva; la respuesta debe identificar la versión vigente resultante.
4. Mantener compatibilidad con los endpoints existentes y entregar errores accionables con ruta de revisión.
5. Auditar consultas, ediciones y restauraciones sin registrar secretos.
6. Probar aislamiento tenant/global, permisos y carreras de actualización.

## Salida y puerta de fase

Contrato API documentado en código y pruebas enfocadas en verde. Firmar `PVE26-02` antes de integrar la pantalla.
